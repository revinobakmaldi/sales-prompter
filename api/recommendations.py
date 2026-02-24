"""
GET  /api/recommendations?retailer_id=  — fetch cached recommendations
POST /api/recommendations?action=refresh — recalculate Phase 1 for retailers
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from flask import Flask, jsonify, request
from flask_cors import CORS
from supabase import create_client

from _rules import refresh_phase1_for_retailer

app = Flask(__name__)
CORS(app)


def get_db():
    return create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_ANON_KEY"])


# ---------------------------------------------------------------------------
# GET — cached recommendations for one retailer
# ---------------------------------------------------------------------------

@app.route("/api/recommendations", methods=["GET"])
@app.route("/api/recommendations/<retailer_id>", methods=["GET"])
def get_recommendations(retailer_id=None):
    db = get_db()
    retailer_id = retailer_id or request.args.get("retailer_id")
    if not retailer_id:
        return jsonify({"error": "retailer_id parameter required"}), 400

    # Fetch top-10 recommendations with product details
    result = (
        db.table("recommendations")
        .select("*, product:products(*)")
        .eq("retailer_id", retailer_id)
        .order("rank")
        .limit(10)
        .execute()
    )

    if not result.data:
        return jsonify([])

    # Attach the active promotion for each product in one bulk query
    product_ids = [r["product_id"] for r in result.data]
    promo_result = (
        db.table("promotions")
        .select("*")
        .in_("product_id", product_ids)
        .eq("is_active", True)
        .execute()
    )
    promo_map: dict[str, dict] = {}
    for promo in promo_result.data:
        promo_map[promo["product_id"]] = promo

    recommendations = []
    for rec in result.data:
        rec["promotion"] = promo_map.get(rec["product_id"])
        recommendations.append(rec)

    return jsonify(recommendations)


# ---------------------------------------------------------------------------
# POST — refresh Phase 1 recommendations  (?action=refresh)
# ---------------------------------------------------------------------------

@app.route("/api/recommendations", methods=["POST"])
@app.route("/api/recommendations/refresh", methods=["POST"])
def refresh_recommendations():
    action = request.args.get("action", "refresh")
    if action != "refresh":
        return jsonify({"error": "Use ?action=refresh"}), 400

    db = get_db()
    body = request.get_json(silent=True) or {}
    retailer_ids: list[str] | None = body.get("retailer_ids")

    if not retailer_ids:
        # Refresh all retailers
        all_retailers = db.table("retailers").select("id").execute()
        retailer_ids = [r["id"] for r in all_retailers.data]

    import traceback

    total_updated = 0
    for rid in retailer_ids:
        try:
            total_updated += refresh_phase1_for_retailer(rid, db)
        except Exception as exc:
            traceback.print_exc()
            return jsonify({"error": f"Failed on retailer {rid}: {exc}"}), 500

    return jsonify(
        {
            "refreshed": len(retailer_ids),
            "recommendations_updated": total_updated,
        }
    )
