"""GET|POST /api/salesmen — salesman management."""
import io
import os

import pandas as pd
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


UPLOAD_REQUIRED_COLS = {"name", "code", "region"}


@app.route("/api/salesmen/upload", methods=["POST"])
def upload_salesmen():
    db = get_db()

    if "file" not in request.files:
        return jsonify({"error": "No file field in request"}), 400

    file = request.files["file"]
    try:
        content = file.read().decode("utf-8")
        df = pd.read_csv(io.StringIO(content))
    except Exception as exc:
        return jsonify({"error": f"CSV parse error: {exc}"}), 400

    missing = UPLOAD_REQUIRED_COLS - set(df.columns)
    if missing:
        return jsonify({"error": f"Missing columns: {sorted(missing)}"}), 400

    for col in ("name", "code", "region"):
        df[col] = df[col].astype(str).str.strip()

    records = df[["name", "code", "region"]].to_dict(orient="records")

    upserted = 0
    batch_size = 500
    for i in range(0, len(records), batch_size):
        batch = records[i : i + batch_size]
        db.table("salesmen").upsert(batch, on_conflict="code").execute()
        upserted += len(batch)

    return jsonify({"upserted": upserted})
