"""GET|POST /api/retailers — retailer CRUD."""
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


UPLOAD_REQUIRED_COLS = {"name", "code", "region", "tier", "salesman_code"}


@app.route("/api/retailers/upload", methods=["POST"])
def upload_retailers():
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

    for col in ("name", "code", "region", "tier", "salesman_code"):
        df[col] = df[col].astype(str).str.strip()

    # Build salesman_code -> id lookup
    unique_codes = df["salesman_code"].unique().tolist()
    salesman_map: dict[str, str] = {}
    for code in unique_codes:
        result = (
            db.table("salesmen")
            .select("id")
            .eq("code", code)
            .limit(1)
            .execute()
        )
        if result.data:
            salesman_map[code] = result.data[0]["id"]

    warnings: list[str] = []
    records = []
    for _, row in df.iterrows():
        s_id = salesman_map.get(row["salesman_code"])
        if not s_id:
            warnings.append(f"Salesman code '{row['salesman_code']}' not found, skipping retailer '{row['code']}'")
            continue
        records.append({
            "name": row["name"],
            "code": row["code"],
            "region": row["region"],
            "tier": row["tier"],
            "salesman_id": s_id,
        })

    upserted = 0
    batch_size = 500
    for i in range(0, len(records), batch_size):
        batch = records[i : i + batch_size]
        db.table("retailers").upsert(batch, on_conflict="code").execute()
        upserted += len(batch)

    return jsonify({"upserted": upserted, "warnings": warnings})
