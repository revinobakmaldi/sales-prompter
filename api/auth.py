"""POST /api/auth — password gate (mirrors resume-lens pattern)."""
import os
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)


@app.route("/api/auth", methods=["POST"])
def auth():
    data = request.get_json(silent=True) or {}
    password = data.get("password", "")
    expected = os.environ.get("APP_PASSWORD", "")

    if not expected:
        return jsonify({"error": "APP_PASSWORD not configured"}), 500

    if password == expected:
        return jsonify({"success": True})
    return jsonify({"success": False, "error": "Invalid password"}), 401
