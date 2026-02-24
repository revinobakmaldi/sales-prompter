"""GET|POST /api/retailers — retailer CRUD."""
import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from supabase import create_client

app = Flask(__name__)
CORS(app)


def get_db():
    return create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_ANON_KEY"])


@app.route("/api/retailers", methods=["GET"])
def get_retailers():
    db = get_db()
    id_ = request.args.get("id")
    salesman_id = request.args.get("salesman_id")

    if id_:
        result = (
            db.table("retailers")
            .select("*, salesman:salesmen(*)")
            .eq("id", id_)
            .single()
            .execute()
        )
        return jsonify(result.data)

    query = db.table("retailers").select("*, salesman:salesmen(*)")
    if salesman_id:
        query = query.eq("salesman_id", salesman_id)

    result = query.order("name").execute()
    return jsonify(result.data)


@app.route("/api/retailers", methods=["POST"])
def create_retailer():
    db = get_db()
    data = request.get_json(silent=True) or {}
    result = db.table("retailers").insert(data).execute()
    return jsonify(result.data[0]), 201
