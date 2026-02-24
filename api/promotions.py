"""GET|POST|PUT /api/promotions — promo / NPL list management."""
import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from supabase import create_client

app = Flask(__name__)
CORS(app)


def get_db():
    return create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_ANON_KEY"])


@app.route("/api/promotions", methods=["GET"])
def get_promotions():
    db = get_db()
    active_only = request.args.get("active") == "true"

    query = db.table("promotions").select("*, product:products(*)")
    if active_only:
        query = query.eq("is_active", True)

    result = query.order("created_at", desc=True).execute()
    return jsonify(result.data)


@app.route("/api/promotions", methods=["POST"])
def create_promotion():
    db = get_db()
    data = request.get_json(silent=True) or {}
    result = db.table("promotions").insert(data).execute()
    return jsonify(result.data[0]), 201


@app.route("/api/promotions", methods=["PUT"])
def update_promotion():
    db = get_db()
    id_ = request.args.get("id")
    if not id_:
        return jsonify({"error": "id parameter required"}), 400

    data = request.get_json(silent=True) or {}
    result = db.table("promotions").update(data).eq("id", id_).execute()
    return jsonify(result.data[0])
