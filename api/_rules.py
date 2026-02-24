"""
Phase 1 rule-based scoring helpers.

All functions accept a Supabase `db` client as a parameter so they can be
called from any serverless handler without creating a new connection.
"""
from datetime import date, timedelta
from typing import Optional


# ---------------------------------------------------------------------------
# Low-level signal helpers
# ---------------------------------------------------------------------------

def get_last_purchase_date(
    retailer_id: str, product_id: str, db
) -> Optional[date]:
    result = (
        db.table("transactions")
        .select("transaction_date")
        .eq("retailer_id", retailer_id)
        .eq("product_id", product_id)
        .order("transaction_date", desc=True)
        .limit(1)
        .execute()
    )
    if result.data:
        return date.fromisoformat(result.data[0]["transaction_date"])
    return None


def get_active_promo(product_id: str, db) -> bool:
    result = (
        db.table("promotions")
        .select("id")
        .eq("product_id", product_id)
        .eq("is_active", True)
        .limit(1)
        .execute()
    )
    return bool(result.data)


def get_order_trend(
    retailer_id: str, product_id: str, db, today: date
) -> str:
    """
    Compare order quantity in the last 90 days versus the prior 90 days.
    Returns 'declining' if recent volume is <70 % of the older period.
    """
    cutoff_recent = today - timedelta(days=90)
    cutoff_older = today - timedelta(days=180)

    recent = (
        db.table("transactions")
        .select("quantity")
        .eq("retailer_id", retailer_id)
        .eq("product_id", product_id)
        .gte("transaction_date", cutoff_recent.isoformat())
        .execute()
    )
    older = (
        db.table("transactions")
        .select("quantity")
        .eq("retailer_id", retailer_id)
        .eq("product_id", product_id)
        .gte("transaction_date", cutoff_older.isoformat())
        .lt("transaction_date", cutoff_recent.isoformat())
        .execute()
    )

    recent_qty = sum(float(r["quantity"]) for r in recent.data) if recent.data else 0.0
    older_qty = sum(float(r["quantity"]) for r in older.data) if older.data else 0.0

    if older_qty > 0 and recent_qty < older_qty * 0.7:
        return "declining"
    return "stable"


# ---------------------------------------------------------------------------
# Phase 1 score for a single retailer–product pair
# ---------------------------------------------------------------------------

def phase1_score(
    retailer_id: str, product_id: str, db, today: date
) -> dict:
    signals: dict[str, float] = {}

    # Signal 1 — Recency
    last_purchase = get_last_purchase_date(retailer_id, product_id, db)
    days_inactive = (today - last_purchase).days if last_purchase else 999
    signals["recency_score"] = min(days_inactive / 90, 1.0)

    # Signal 2 — Active promo / NPL
    signals["promo_boost"] = 0.3 if get_active_promo(product_id, db) else 0.0

    # Signal 3 — Never purchased before
    signals["new_product_bonus"] = 0.2 if last_purchase is None else 0.0

    # Signal 4 — Declining order frequency
    trend = get_order_trend(retailer_id, product_id, db, today)
    signals["decline_flag"] = 0.15 if trend == "declining" else 0.0

    total = (
        signals["recency_score"] * 0.50
        + signals["promo_boost"]
        + signals["new_product_bonus"]
        + signals["decline_flag"]
    )

    return {
        "score": round(min(total, 1.0), 3),
        "reason_tags": [k for k, v in signals.items() if v > 0],
        "phase": "phase1",
    }


# ---------------------------------------------------------------------------
# Refresh Phase 1 recommendations for one retailer
# ---------------------------------------------------------------------------

def refresh_phase1_for_retailer(retailer_id: str, db) -> int:
    """
    Score all eligible products for a retailer and upsert into the
    recommendations table.  Eligible = active promo products ∪ products
    the retailer has previously purchased.
    """
    today = date.today()

    promo_result = (
        db.table("promotions")
        .select("product_id")
        .eq("is_active", True)
        .execute()
    )
    promo_pids = {p["product_id"] for p in promo_result.data}

    txn_result = (
        db.table("transactions")
        .select("product_id")
        .eq("retailer_id", retailer_id)
        .execute()
    )
    bought_pids = {t["product_id"] for t in txn_result.data}

    eligible = list(promo_pids | bought_pids)
    if not eligible:
        return 0

    scored = []
    for product_id in eligible:
        result = phase1_score(retailer_id, product_id, db, today)
        scored.append(
            {
                "retailer_id": retailer_id,
                "product_id": product_id,
                "score": result["score"],
                "rank": 0,
                "reason_tags": result["reason_tags"],
                "phase": result["phase"],
            }
        )

    scored.sort(key=lambda x: x["score"], reverse=True)
    for i, s in enumerate(scored, 1):
        s["rank"] = i

    db.table("recommendations").upsert(scored).execute()
    return len(scored)
