"""
GET  /api/insights?retailer_id=  — fetch cached insight + freshness flag
POST /api/insights?retailer_id=  — generate (or regenerate) insight via OpenRouter
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import requests as http_requests
from flask import Flask, jsonify, request
from flask_cors import CORS
from supabase import create_client

app = Flask(__name__)
CORS(app)

OPENROUTER_API_KEY = os.environ.get("OPENROUTER_API_KEY", "")
LLM_MODEL = "qwen/qwen3-vl-235b-a22b-thinking"


def get_db():
    return create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_ANON_KEY"])


def _latest_recommendation_ts(db, retailer_id: str) -> str | None:
    """Return the most recent generated_at from recommendations for a retailer."""
    result = (
        db.table("recommendations")
        .select("generated_at")
        .eq("retailer_id", retailer_id)
        .order("generated_at", desc=True)
        .limit(1)
        .execute()
    )
    if result.data:
        return result.data[0]["generated_at"]
    return None


# ---------------------------------------------------------------------------
# GET — cached insight
# ---------------------------------------------------------------------------

@app.route("/api/insights", methods=["GET"])
@app.route("/api/insights/<retailer_id>", methods=["GET"])
def get_insight(retailer_id=None):
    db = get_db()
    retailer_id = retailer_id or request.args.get("retailer_id")
    if not retailer_id:
        return jsonify({"error": "retailer_id parameter required"}), 400

    result = (
        db.table("insights")
        .select("*")
        .eq("retailer_id", retailer_id)
        .limit(1)
        .execute()
    )

    if not result.data:
        return jsonify({"insight": None, "fresh": False})

    insight = result.data[0]
    latest_rec_ts = _latest_recommendation_ts(db, retailer_id)

    fresh = True
    if latest_rec_ts and insight["generated_at"] < latest_rec_ts:
        fresh = False

    return jsonify({"insight": insight, "fresh": fresh})


# ---------------------------------------------------------------------------
# POST — generate insight via OpenRouter
# ---------------------------------------------------------------------------

@app.route("/api/insights", methods=["POST"])
@app.route("/api/insights/<retailer_id>", methods=["POST"])
def generate_insight(retailer_id=None):
    db = get_db()
    retailer_id = retailer_id or request.args.get("retailer_id")
    if not retailer_id:
        return jsonify({"error": "retailer_id parameter required"}), 400

    # Fetch retailer info
    retailer_result = (
        db.table("retailers").select("*").eq("id", retailer_id).limit(1).execute()
    )
    if not retailer_result.data:
        return jsonify({"error": "Retailer not found"}), 404
    retailer = retailer_result.data[0]

    # Fetch top recommendations with product + promo details
    rec_result = (
        db.table("recommendations")
        .select("*, product:products(*)")
        .eq("retailer_id", retailer_id)
        .order("rank")
        .limit(10)
        .execute()
    )
    recommendations = rec_result.data or []

    # Attach promotions
    if recommendations:
        product_ids = [r["product_id"] for r in recommendations]
        promo_result = (
            db.table("promotions")
            .select("*")
            .in_("product_id", product_ids)
            .eq("is_active", True)
            .execute()
        )
        promo_map = {p["product_id"]: p for p in promo_result.data}
        for rec in recommendations:
            rec["promotion"] = promo_map.get(rec["product_id"])

    # Build the prompt context
    rec_lines = []
    for rec in recommendations:
        product = rec.get("product") or {}
        promo = rec.get("promotion")
        line = f"#{rec['rank']} {product.get('name', 'Unknown')} ({product.get('category', '')}) — tags: {rec.get('reason_tags', [])}"
        if promo:
            line += f" | PROMO: {promo['promo_type']} {promo.get('discount_pct', 0)}% off"
        rec_lines.append(line)

    rec_text = "\n".join(rec_lines) if rec_lines else "No recommendations available."

    prompt = f"""You are a sales assistant. Write a visit briefing for a salesman about to visit this retailer.

Retailer: {retailer['name']} ({retailer.get('tier', 'unknown')} tier, {retailer.get('region', 'unknown')} region)

Today's recommended products (ranked by priority):
{rec_text}

Instructions:
- Write exactly 3-4 sentences.
- Lead with the single most important action.
- Highlight any active promotions the salesman should mention.
- Note any declining or new-to-retailer products.
- Use a direct, actionable tone — no greetings or fluff."""

    # Call OpenRouter
    try:
        llm_response = http_requests.post(
            "https://openrouter.ai/api/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": LLM_MODEL,
                "messages": [{"role": "user", "content": prompt}],
                "max_tokens": 300,
                "temperature": 0.4,
            },
            timeout=15,
        )
        llm_response.raise_for_status()
        summary = llm_response.json()["choices"][0]["message"]["content"].strip()
    except Exception as e:
        return jsonify({"error": f"LLM call failed: {str(e)}"}), 502

    # Upsert into insights table
    db.table("insights").upsert(
        {
            "retailer_id": retailer_id,
            "summary": summary,
            "model_used": LLM_MODEL,
            "generated_at": "now()",
        },
        on_conflict="retailer_id",
    ).execute()

    # Re-fetch to get the actual generated_at timestamp
    result = (
        db.table("insights")
        .select("*")
        .eq("retailer_id", retailer_id)
        .limit(1)
        .execute()
    )
    insight = result.data[0] if result.data else None

    return jsonify({"insight": insight, "fresh": True})
