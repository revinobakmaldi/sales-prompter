"""POST /api/visits — log a salesman visit."""
import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from supabase import create_client

app = Flask(__name__)
CORS(app)


def get_db():
    return create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_ANON_KEY"])


@app.route("/api/visits", methods=["POST"])
def log_visit():
    db = get_db()
    data = request.get_json(silent=True) or {}

    for field in ("salesman_id", "retailer_id"):
        if not data.get(field):
            return jsonify({"error": f"{field} is required"}), 400

    result = db.table("visits").insert(data).execute()
    return jsonify(result.data[0]), 201
