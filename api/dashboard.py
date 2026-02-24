"""GET /api/dashboard — manager KPI stats."""
import os
from flask import Flask, jsonify
from flask_cors import CORS
from supabase import create_client

app = Flask(__name__)
CORS(app)


def get_db():
    return create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_ANON_KEY"])


@app.route("/api/dashboard", methods=["GET"])
def get_dashboard():
    db = get_db()

    # Counts
    retailers_res = db.table("retailers").select("*", count="exact").execute()
    salesmen_res = db.table("salesmen").select("*", count="exact").execute()
    promos_res = (
        db.table("promotions")
        .select("*", count="exact")
        .eq("is_active", True)
        .execute()
    )

    total_retailers = retailers_res.count or 0
    total_salesmen = salesmen_res.count or 0
    active_promos = promos_res.count or 0

    # Average penetration rate across active promo products
    # Penetration = % of retailers that have bought the product at least once
    promo_products = (
        db.table("promotions")
        .select("product_id")
        .eq("is_active", True)
        .execute()
    )
    promo_pids = list({p["product_id"] for p in promo_products.data})

    avg_penetration = 0.0
    if promo_pids and total_retailers > 0:
        penetrations = []
        for pid in promo_pids:
            buyers_res = (
                db.table("transactions")
                .select("retailer_id")
                .eq("product_id", pid)
                .execute()
            )
            unique_buyers = len({t["retailer_id"] for t in buyers_res.data})
            penetrations.append(unique_buyers / total_retailers)
        avg_penetration = round(
            sum(penetrations) / len(penetrations) * 100, 1
        ) if penetrations else 0.0

    return jsonify(
        {
            "total_retailers": total_retailers,
            "total_salesmen": total_salesmen,
            "active_promos": active_promos,
            "avg_penetration_rate": avg_penetration,
        }
    )
