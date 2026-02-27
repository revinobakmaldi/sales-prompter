"""GET|PUT /api/scoring-config — Phase 1 scoring weights."""
import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from supabase import create_client

app = Flask(__name__)
CORS(app)

DEFAULTS = {
    "recency_weight": 0.50,
    "promo_boost": 0.30,
    "new_product_bonus": 0.20,
    "decline_flag": 0.15,
    "decline_threshold": 0.70,
}


def get_db():
    return create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_ANON_KEY"])


@app.route("/api/scoring-config", methods=["GET"])
def get_scoring_config():
    db = get_db()
    result = db.table("config").select("value").eq("key", "scoring_weights").execute()
    if result.data:
        return jsonify(result.data[0]["value"])
    return jsonify(DEFAULTS)


@app.route("/api/scoring-config", methods=["PUT"])
def update_scoring_config():
    db = get_db()
    data = request.get_json(silent=True) or {}

    # Validate all keys are present and numeric
    for key in DEFAULTS:
        if key not in data:
            return jsonify({"error": f"Missing key: {key}"}), 400
        if not isinstance(data[key], (int, float)):
            return jsonify({"error": f"{key} must be a number"}), 400

    db.table("config").upsert(
        {"key": "scoring_weights", "value": data, "updated_at": "now()"},
        on_conflict="key",
    ).execute()

    return jsonify(data)
