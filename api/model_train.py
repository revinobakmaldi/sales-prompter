"""
POST /api/model/train

Phase 2 — ALS collaborative filtering model training.

Loads all transaction data, trains an ALS model, blends CF scores with
Phase 1 rule scores, and writes hybrid recommendations to the DB.

Fallback: retailers with < 3 transactions use Phase 1 scores only.
"""
import os
import sys
from datetime import date, timedelta
from itertools import groupby

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from flask import Flask, jsonify
from flask_cors import CORS
from supabase import create_client

app = Flask(__name__)
CORS(app)

# Disable GPU — Vercel has no CUDA
os.environ.setdefault("IMPLICIT_USE_GPU", "0")

MIN_TRANSACTIONS_FOR_CF = 3


def get_db():
    return create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_ANON_KEY"])


@app.route("/api/model/train", methods=["POST"])
def train_model():
    try:
        import numpy as np
        import pandas as pd
        from implicit.als import AlternatingLeastSquares
        from scipy.sparse import csr_matrix
    except ImportError as exc:
        return jsonify({"error": f"Missing ML dependency: {exc}"}), 500

    db = get_db()
    today = date.today()

    # ------------------------------------------------------------------
    # 1. Load all data in bulk (avoid N+1 queries in the scoring loop)
    # ------------------------------------------------------------------
    txns_res = (
        db.table("transactions")
        .select("retailer_id,product_id,quantity,transaction_date")
        .execute()
    )
    if not txns_res.data or len(txns_res.data) < 10:
        return jsonify({"error": "Insufficient transaction data for training (need ≥ 10 rows)"}), 400

    df = pd.DataFrame(txns_res.data)
    df["transaction_date"] = pd.to_datetime(df["transaction_date"])
    df["quantity"] = pd.to_numeric(df["quantity"], errors="coerce").fillna(0)

    promos_res = db.table("promotions").select("product_id").eq("is_active", True).execute()
    promo_pid_set: set[str] = {p["product_id"] for p in promos_res.data}

    # ------------------------------------------------------------------
    # 2. Phase 1 signals — computed in-memory via pandas
    # ------------------------------------------------------------------
    cutoff_recent = pd.Timestamp(today - timedelta(days=90))
    cutoff_older  = pd.Timestamp(today - timedelta(days=180))

    # Last purchase date per (retailer, product)
    last_purchase = (
        df.groupby(["retailer_id", "product_id"])["transaction_date"]
        .max()
        .reset_index()
        .rename(columns={"transaction_date": "last_date"})
    )
    last_purchase["days_inactive"] = (pd.Timestamp(today) - last_purchase["last_date"]).dt.days
    last_purchase["recency_score"] = (last_purchase["days_inactive"] / 90).clip(upper=1.0)

    # Promo boost
    last_purchase["promo_boost"] = (
        last_purchase["product_id"].isin(promo_pid_set).map({True: 0.3, False: 0.0})
    )

    # New-product bonus (product never bought by this retailer → already in last_purchase
    # means it HAS been bought.  We handle never-bought products separately below.)
    last_purchase["new_product_bonus"] = 0.0  # all rows in last_purchase have been bought

    # Decline flag
    recent_qty = (
        df[df["transaction_date"] >= cutoff_recent]
        .groupby(["retailer_id", "product_id"])["quantity"]
        .sum()
        .reset_index()
        .rename(columns={"quantity": "recent_qty"})
    )
    older_qty = (
        df[(df["transaction_date"] >= cutoff_older) & (df["transaction_date"] < cutoff_recent)]
        .groupby(["retailer_id", "product_id"])["quantity"]
        .sum()
        .reset_index()
        .rename(columns={"quantity": "older_qty"})
    )
    trend = last_purchase[["retailer_id", "product_id"]].merge(recent_qty, how="left").merge(older_qty, how="left")
    trend["recent_qty"] = trend["recent_qty"].fillna(0)
    trend["older_qty"] = trend["older_qty"].fillna(0)
    trend["decline_flag"] = (
        (trend["older_qty"] > 0) & (trend["recent_qty"] < trend["older_qty"] * 0.7)
    ).map({True: 0.15, False: 0.0})

    last_purchase = last_purchase.merge(
        trend[["retailer_id", "product_id", "decline_flag"]], on=["retailer_id", "product_id"], how="left"
    )
    last_purchase["decline_flag"] = last_purchase["decline_flag"].fillna(0.0)

    last_purchase["p1_score"] = (
        last_purchase["recency_score"] * 0.50
        + last_purchase["promo_boost"]
        + last_purchase["new_product_bonus"]
        + last_purchase["decline_flag"]
    ).clip(upper=1.0).round(3)

    # Reason tags (per row)
    def build_tags(row) -> list[str]:
        tags = []
        if row["recency_score"] > 0:
            tags.append("recency_score")
        if row["promo_boost"] > 0:
            tags.append("promo_boost")
        if row["new_product_bonus"] > 0:
            tags.append("new_product_bonus")
        if row["decline_flag"] > 0:
            tags.append("decline_flag")
        return tags

    last_purchase["reason_tags"] = last_purchase.apply(build_tags, axis=1)

    # ------------------------------------------------------------------
    # 3. Products-never-bought — add rows for active promo products
    # ------------------------------------------------------------------
    all_retailer_ids = df["retailer_id"].unique().tolist()
    bought_pairs = set(zip(last_purchase["retailer_id"], last_purchase["product_id"]))

    never_rows = []
    for rid in all_retailer_ids:
        for pid in promo_pid_set:
            if (rid, pid) not in bought_pairs:
                never_rows.append(
                    {
                        "retailer_id": rid,
                        "product_id": pid,
                        "recency_score": 1.0,
                        "promo_boost": 0.3,
                        "new_product_bonus": 0.2,
                        "decline_flag": 0.0,
                        "p1_score": round(min(1.0 * 0.5 + 0.3 + 0.2, 1.0), 3),
                        "reason_tags": ["recency_score", "promo_boost", "new_product_bonus"],
                    }
                )

    if never_rows:
        last_purchase = pd.concat(
            [last_purchase, pd.DataFrame(never_rows)], ignore_index=True
        )

    # ------------------------------------------------------------------
    # 4. Train ALS model
    # ------------------------------------------------------------------
    agg = df.groupby(["retailer_id", "product_id"])["quantity"].sum().reset_index()

    retailer_ids = agg["retailer_id"].unique().tolist()
    product_ids  = agg["product_id"].unique().tolist()
    r_map = {rid: i for i, rid in enumerate(retailer_ids)}
    p_map = {pid: i for i, pid in enumerate(product_ids)}

    rows_idx = agg["retailer_id"].map(r_map).values
    cols_idx = agg["product_id"].map(p_map).values
    vals     = agg["quantity"].values.astype(np.float32)

    matrix = csr_matrix(
        (vals, (rows_idx, cols_idx)), shape=(len(retailer_ids), len(product_ids))
    )

    model = AlternatingLeastSquares(
        factors=50,
        regularization=0.01,
        iterations=30,
    )
    model.fit(matrix)

    # Retailer transaction count (for cold-start check)
    retailer_txn_counts = df.groupby("retailer_id").size().to_dict()

    # ------------------------------------------------------------------
    # 5. Compute CF scores for all retailers
    # ------------------------------------------------------------------
    cf_lookup: dict[str, dict[str, float]] = {}  # retailer_id -> {product_id: score}

    for rid in retailer_ids:
        if retailer_txn_counts.get(rid, 0) < MIN_TRANSACTIONS_FOR_CF:
            continue

        r_idx = r_map[rid]
        cf_ids, cf_scores = model.recommend(
            r_idx,
            matrix[r_idx],
            N=len(product_ids),
            filter_already_liked_items=False,
        )

        if len(cf_scores) == 0:
            continue

        # Normalise CF scores to [0, 1]
        cf_min, cf_max = float(cf_scores.min()), float(cf_scores.max())
        rng = cf_max - cf_min
        normed: dict[str, float] = {}
        for pid_idx, raw_score in zip(cf_ids, cf_scores):
            if pid_idx < len(product_ids):
                pid = product_ids[pid_idx]
                normed[pid] = (float(raw_score) - cf_min) / rng if rng > 0 else 0.0

        cf_lookup[rid] = normed

    # ------------------------------------------------------------------
    # 6. Merge Phase 1 + CF → hybrid score
    # ------------------------------------------------------------------
    def hybrid(row) -> tuple[float, list[str], str]:
        rid = row["retailer_id"]
        pid = row["product_id"]
        p1  = float(row["p1_score"])
        cf  = cf_lookup.get(rid, {}).get(pid, 0.0)
        promo_flag = 0.2 if pid in promo_pid_set else 0.0

        # Hybrid: Phase1 × 0.5  +  CF × 0.3  +  promo boost × 0.2
        score = round(min(p1 * 0.5 + cf * 0.3 + promo_flag, 1.0), 3)
        tags  = list(row["reason_tags"])
        if cf > 0:
            tags.append("cf_signal")

        phase = "phase2" if rid in cf_lookup and pid in cf_lookup.get(rid, {}) else "phase1"
        return score, tags, phase

    last_purchase[["hybrid_score", "final_tags", "phase"]] = last_purchase.apply(
        lambda r: pd.Series(hybrid(r)), axis=1
    )

    # ------------------------------------------------------------------
    # 7. Sort and assign ranks per retailer, then upsert
    # ------------------------------------------------------------------
    last_purchase.sort_values(["retailer_id", "hybrid_score"], ascending=[True, False], inplace=True)
    last_purchase["rank"] = (
        last_purchase.groupby("retailer_id").cumcount() + 1
    )

    records = last_purchase[
        ["retailer_id", "product_id", "hybrid_score", "rank", "final_tags", "phase"]
    ].rename(columns={"hybrid_score": "score", "final_tags": "reason_tags"})

    records_list = records.to_dict(orient="records")

    batch_size = 500
    for i in range(0, len(records_list), batch_size):
        batch = records_list[i : i + batch_size]
        db.table("recommendations").upsert(batch).execute()

    return jsonify(
        {
            "message": "Model trained successfully",
            "retailers_processed": len(retailer_ids),
            "recommendations_updated": len(records_list),
        }
    )
