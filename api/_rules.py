"""
Phase 1 rule-based scoring helpers.

All functions accept a Supabase `db` client as a parameter so they can be
called from any serverless handler without creating a new connection.
"""
from datetime import date, timedelta


# ---------------------------------------------------------------------------
# Refresh Phase 1 recommendations for one retailer (bulk approach)
# ---------------------------------------------------------------------------

def refresh_phase1_for_retailer(retailer_id: str, db) -> int:
    """
    Score all eligible products for a retailer and upsert into the
    recommendations table.  Eligible = active promo products ∪ products
    the retailer has previously purchased.
    """
    today = date.today()
    cutoff_recent = (today - timedelta(days=90)).isoformat()
    cutoff_older = (today - timedelta(days=180)).isoformat()

    # Bulk fetch: active promos
    promo_result = (
        db.table("promotions")
        .select("product_id")
        .eq("is_active", True)
        .execute()
    )
    promo_pids = {p["product_id"] for p in promo_result.data}

    # Bulk fetch: all transactions for this retailer
    txn_result = (
        db.table("transactions")
        .select("product_id,transaction_date,quantity")
        .eq("retailer_id", retailer_id)
        .execute()
    )

    # Build lookup structures from transactions
    bought_pids: set[str] = set()
    last_purchase: dict[str, str] = {}       # product_id -> max date
    recent_qty: dict[str, float] = {}        # product_id -> qty in last 90d
    older_qty: dict[str, float] = {}         # product_id -> qty in 90-180d

    for t in txn_result.data:
        pid = t["product_id"]
        txn_date = t["transaction_date"]
        qty = float(t["quantity"])
        bought_pids.add(pid)

        # Track last purchase date
        if pid not in last_purchase or txn_date > last_purchase[pid]:
            last_purchase[pid] = txn_date

        # Accumulate quantities by period
        if txn_date >= cutoff_recent:
            recent_qty[pid] = recent_qty.get(pid, 0.0) + qty
        elif txn_date >= cutoff_older:
            older_qty[pid] = older_qty.get(pid, 0.0) + qty

    eligible = list(promo_pids | bought_pids)
    if not eligible:
        return 0

    scored = []
    for pid in eligible:
        signals: dict[str, float] = {}

        # Signal 1 — Recency
        lp = last_purchase.get(pid)
        if lp:
            days_inactive = (today - date.fromisoformat(lp)).days
        else:
            days_inactive = 999
        signals["recency_score"] = min(days_inactive / 90, 1.0)

        # Signal 2 — Active promo
        signals["promo_boost"] = 0.3 if pid in promo_pids else 0.0

        # Signal 3 — Never purchased
        signals["new_product_bonus"] = 0.2 if pid not in bought_pids else 0.0

        # Signal 4 — Declining order frequency
        r_qty = recent_qty.get(pid, 0.0)
        o_qty = older_qty.get(pid, 0.0)
        signals["decline_flag"] = 0.15 if (o_qty > 0 and r_qty < o_qty * 0.7) else 0.0

        total = (
            signals["recency_score"] * 0.50
            + signals["promo_boost"]
            + signals["new_product_bonus"]
            + signals["decline_flag"]
        )

        scored.append(
            {
                "retailer_id": retailer_id,
                "product_id": pid,
                "score": round(min(total, 1.0), 3),
                "rank": 0,
                "reason_tags": [k for k, v in signals.items() if v > 0],
                "phase": "phase1",
            }
        )

    scored.sort(key=lambda x: x["score"], reverse=True)
    for i, s in enumerate(scored, 1):
        s["rank"] = i

    db.table("recommendations").upsert(scored, on_conflict="retailer_id,product_id").execute()
    return len(scored)
