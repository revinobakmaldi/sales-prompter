"""GET|POST /api/salesmen — salesman management."""
import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from supabase import create_client

app = Flask(__name__)
CORS(app)


def get_db():
    return create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_ANON_KEY"])


@app.route("/api/salesmen", methods=["GET"])
def get_salesmen():
    db = get_db()
    id_ = request.args.get("id")

    if id_:
        result = (
            db.table("salesmen").select("*").eq("id", id_).single().execute()
        )
        return jsonify(result.data)

    result = db.table("salesmen").select("*").order("name").execute()
    return jsonify(result.data)


@app.route("/api/salesmen", methods=["POST"])
def create_salesman():
    db = get_db()
    data = request.get_json(silent=True) or {}
    result = db.table("salesmen").insert(data).execute()
    return jsonify(result.data[0]), 201
