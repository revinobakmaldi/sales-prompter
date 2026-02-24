"""
GET  /api/transactions?retailer_id=  — purchase history for a retailer
POST /api/transactions?action=upload — bulk CSV ingest
"""
import io
import os

import pandas as pd
from flask import Flask, jsonify, request
from flask_cors import CORS
from supabase import create_client

app = Flask(__name__)
CORS(app)

REQUIRED_COLS = {
    "transaction_date",
    "retailer_code",
    "retailer_name",
    "sku",
    "product_name",
    "quantity",
    "amount",
}


def get_db():
    return create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_ANON_KEY"])


# ---------------------------------------------------------------------------
# GET — transaction history for a retailer
# ---------------------------------------------------------------------------

@app.route("/api/transactions", methods=["GET"])
def get_transactions():
    db = get_db()
    retailer_id = request.args.get("retailer_id")
    if not retailer_id:
        return jsonify({"error": "retailer_id parameter required"}), 400

    result = (
        db.table("transactions")
        .select("*, product:products(*)")
        .eq("retailer_id", retailer_id)
        .order("transaction_date", desc=True)
        .execute()
    )
    return jsonify(result.data)


# ---------------------------------------------------------------------------
# POST — CSV upload  (?action=upload)
# ---------------------------------------------------------------------------

@app.route("/api/transactions", methods=["POST"])
def upload_transactions():
    action = request.args.get("action")
    if action != "upload":
        return jsonify({"error": "Use ?action=upload for CSV ingestion"}), 400

    db = get_db()

    if "file" not in request.files:
        return jsonify({"error": "No file field in request"}), 400

    file = request.files["file"]
    try:
        content = file.read().decode("utf-8")
        df = pd.read_csv(io.StringIO(content))
    except Exception as exc:
        return jsonify({"error": f"CSV parse error: {exc}"}), 400

    missing = REQUIRED_COLS - set(df.columns)
    if missing:
        return jsonify({"error": f"Missing columns: {sorted(missing)}"}), 400

    # Strip whitespace from string columns
    for col in ("retailer_code", "retailer_name", "sku", "product_name", "transaction_date"):
        df[col] = df[col].astype(str).str.strip()

    # ---- Auto-upsert retailers ----
    retailer_map: dict[str, str] = {}  # code -> UUID
    for _, row in df[["retailer_code", "retailer_name"]].drop_duplicates().iterrows():
        existing = (
            db.table("retailers")
            .select("id")
            .eq("code", row["retailer_code"])
            .limit(1)
            .execute()
        )
        if existing.data:
            retailer_map[row["retailer_code"]] = existing.data[0]["id"]
        else:
            new_r = (
                db.table("retailers")
                .insert({"name": row["retailer_name"], "code": row["retailer_code"]})
                .execute()
            )
            retailer_map[row["retailer_code"]] = new_r.data[0]["id"]

    # ---- Auto-upsert products ----
    product_map: dict[str, str] = {}  # sku -> UUID
    for _, row in df[["sku", "product_name"]].drop_duplicates().iterrows():
        existing = (
            db.table("products")
            .select("id")
            .eq("sku", row["sku"])
            .limit(1)
            .execute()
        )
        if existing.data:
            product_map[row["sku"]] = existing.data[0]["id"]
        else:
            new_p = (
                db.table("products")
                .insert({"sku": row["sku"], "name": row["product_name"]})
                .execute()
            )
            product_map[row["sku"]] = new_p.data[0]["id"]

    # ---- Build transaction records ----
    records = []
    for _, row in df.iterrows():
        r_id = retailer_map.get(row["retailer_code"])
        p_id = product_map.get(row["sku"])
        if not r_id or not p_id:
            continue
        records.append(
            {
                "retailer_id": r_id,
                "product_id": p_id,
                "quantity": float(row["quantity"]),
                "amount": float(row["amount"]),
                "transaction_date": str(row["transaction_date"]),
            }
        )

    inserted = 0
    if records:
        # Upsert in batches; the UNIQUE constraint deduplicates on re-upload
        batch_size = 500
        for i in range(0, len(records), batch_size):
            batch = records[i : i + batch_size]
            db.table("transactions").upsert(batch).execute()
            inserted += len(batch)

    return jsonify(
        {
            "inserted": inserted,
            "retailers_affected": list(retailer_map.values()),
        }
    )
