"""GET|POST /api/products — product catalog."""
import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from supabase import create_client

app = Flask(__name__)
CORS(app)


def get_db():
    return create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_ANON_KEY"])


@app.route("/api/products", methods=["GET"])
def get_products():
    db = get_db()
    result = db.table("products").select("*").order("name").execute()
    return jsonify(result.data)


@app.route("/api/products", methods=["POST"])
def create_product():
    db = get_db()
    data = request.get_json(silent=True) or {}
    result = db.table("products").insert(data).execute()
    return jsonify(result.data[0]), 201
