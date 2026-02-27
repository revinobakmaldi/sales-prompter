"""
Local dev server — combines all api/*.py Flask apps into one.
Usage:  python server.py
"""
import importlib
import os
import sys

from dotenv import load_dotenv
from flask import Flask
from flask_cors import CORS

load_dotenv(".env.local")

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "api"))

app = Flask(__name__)
CORS(app)

# Import each API module and register its routes on the combined app
_modules = [
    "auth", "salesmen", "retailers", "products",
    "visits", "promotions", "dashboard", "transactions",
    "recommendations", "model_train", "insights", "scoring_config",
]

for name in _modules:
    mod = importlib.import_module(f"api.{name}")
    mod_app: Flask = getattr(mod, "app", None)
    if mod_app is None:
        continue
    for rule in mod_app.url_map.iter_rules():
        if rule.endpoint == "static":
            continue
        view_func = mod_app.view_functions[rule.endpoint]
        # Prefix endpoint name with module to avoid collisions
        app.add_url_rule(
            rule.rule,
            endpoint=f"{name}_{rule.endpoint}",
            view_func=view_func,
            methods=rule.methods - {"OPTIONS", "HEAD"},
        )

if __name__ == "__main__":
    print("Routes registered:")
    for rule in sorted(app.url_map.iter_rules(), key=lambda r: r.rule):
        if rule.endpoint != "static":
            print(f"  {rule.methods - {'OPTIONS', 'HEAD'}} {rule.rule}")
    print()
    app.run(port=5328, debug=True)
