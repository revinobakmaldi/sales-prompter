#!/usr/bin/env python3
"""
SalesPrompter — Demo Seed Script
=================================
Creates:  3 salesmen · 20 retailers · 50 products
          10 active promotions · ~1 800 transactions (6 months)
          Pre-computed Phase 1 recommendations

Usage
-----
  python scripts/seed.py            # seed (safe to re-run — uses upsert)
  python scripts/seed.py --reset    # wipe tables first, then seed fresh

Requirements
------------
  pip install supabase
  export SUPABASE_URL=...
  export SUPABASE_ANON_KEY=...

  Or place the vars in .env.local at the project root.

Note
----
If Supabase RLS is enabled on your tables you will need the service-role key
in SUPABASE_ANON_KEY (or disable RLS for the seed run).
"""

import argparse
import csv
import os
import random
import sys
from collections import defaultdict
from datetime import date, timedelta

# ── env loader ────────────────────────────────────────────────────────────────

def _load_dotenv(path: str) -> None:
    if not os.path.exists(path):
        return
    with open(path) as fh:
        for line in fh:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, _, v = line.partition("=")
            v = v.strip().strip('"').strip("'")
            os.environ.setdefault(k.strip(), v)

# Search project root (one level up from scripts/)
_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_load_dotenv(os.path.join(_root, ".env.local"))
_load_dotenv(os.path.join(_root, ".env"))

SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_KEY = os.environ.get("SUPABASE_ANON_KEY", "")

if not SUPABASE_URL or not SUPABASE_KEY:
    sys.exit("❌  Set SUPABASE_URL and SUPABASE_ANON_KEY (or add them to .env.local).")

from supabase import create_client  # noqa: E402

db = create_client(SUPABASE_URL, SUPABASE_KEY)

# ── reproducibility ───────────────────────────────────────────────────────────
random.seed(42)

START_DATE = date(2025, 8, 1)
END_DATE   = date(2026, 2, 15)   # last possible transaction date
TODAY      = date(2026, 2, 21)

# ── static data ───────────────────────────────────────────────────────────────

SALESMEN = [
    {"name": "Budi Santoso",  "code": "SM-001", "region": "Jakarta"},
    {"name": "Sari Dewi",     "code": "SM-002", "region": "Bandung"},
    {"name": "Andi Pratama",  "code": "SM-003", "region": "Surabaya"},
]

RETAILERS = [
    # Jakarta — Budi (SM-001)
    {"name": "Toko Maju Jaya",     "code": "RT-001", "region": "Jakarta",  "tier": "medium", "sm": "SM-001"},
    {"name": "Minimart Sejahtera", "code": "RT-002", "region": "Jakarta",  "tier": "large",  "sm": "SM-001"},
    {"name": "Warung Berkah",      "code": "RT-003", "region": "Jakarta",  "tier": "small",  "sm": "SM-001"},
    {"name": "Toko Harapan",       "code": "RT-004", "region": "Jakarta",  "tier": "medium", "sm": "SM-001"},
    {"name": "Kios Sentosa",       "code": "RT-005", "region": "Jakarta",  "tier": "small",  "sm": "SM-001"},
    {"name": "Toko Mandiri",       "code": "RT-006", "region": "Jakarta",  "tier": "medium", "sm": "SM-001"},
    {"name": "Warung Barokah",     "code": "RT-007", "region": "Jakarta",  "tier": "small",  "sm": "SM-001"},
    {"name": "Toko Sumber Rejeki", "code": "RT-008", "region": "Jakarta",  "tier": "large",  "sm": "SM-001"},
    # Bandung — Sari (SM-002)
    {"name": "Toko Baru",          "code": "RT-009", "region": "Bandung",  "tier": "medium", "sm": "SM-002"},
    {"name": "Warung Asri",        "code": "RT-010", "region": "Bandung",  "tier": "small",  "sm": "SM-002"},
    {"name": "Kios Makmur",        "code": "RT-011", "region": "Bandung",  "tier": "small",  "sm": "SM-002"},
    {"name": "Toko Pelangi",       "code": "RT-012", "region": "Bandung",  "tier": "medium", "sm": "SM-002"},
    {"name": "Warung Subur",       "code": "RT-013", "region": "Bandung",  "tier": "small",  "sm": "SM-002"},
    {"name": "Minimart Bersama",   "code": "RT-014", "region": "Bandung",  "tier": "large",  "sm": "SM-002"},
    # Surabaya — Andi (SM-003)
    {"name": "Toko Surya",         "code": "RT-015", "region": "Surabaya", "tier": "medium", "sm": "SM-003"},
    {"name": "Warung Mekar",       "code": "RT-016", "region": "Surabaya", "tier": "small",  "sm": "SM-003"},
    {"name": "Kios Abadi",         "code": "RT-017", "region": "Surabaya", "tier": "small",  "sm": "SM-003"},
    {"name": "Toko Cahaya",        "code": "RT-018", "region": "Surabaya", "tier": "medium", "sm": "SM-003"},
    {"name": "Warung Jaya",        "code": "RT-019", "region": "Surabaya", "tier": "small",  "sm": "SM-003"},
    {"name": "Toko Mutiara",       "code": "RT-020", "region": "Surabaya", "tier": "large",  "sm": "SM-003"},
]

PRODUCTS = [
    # ── Snacks (15) ───────────────────────────────────────────────────────────
    {"sku": "SNK-001", "name": "Wafer Coklat 100g",     "category": "Snacks",        "sub_category": "Wafer",       "brand": "DeliciSnack", "price": 5000},
    {"sku": "SNK-002", "name": "Biskuit Susu 200g",      "category": "Snacks",        "sub_category": "Biskuit",     "brand": "DeliciSnack", "price": 8500},
    {"sku": "SNK-003", "name": "Keripik Singkong 250g",  "category": "Snacks",        "sub_category": "Keripik",     "brand": "SnackNesia",  "price": 7000},
    {"sku": "SNK-004", "name": "Kacang Goreng 150g",     "category": "Snacks",        "sub_category": "Kacang",      "brand": "SnackNesia",  "price": 6000},
    {"sku": "SNK-005", "name": "Permen Mint 50g",        "category": "Snacks",        "sub_category": "Permen",      "brand": "SweetJoy",    "price": 3000},
    {"sku": "SNK-006", "name": "Wafer Vanilla 100g",     "category": "Snacks",        "sub_category": "Wafer",       "brand": "DeliciSnack", "price": 5000},
    {"sku": "SNK-007", "name": "Biskuit Keju 200g",      "category": "Snacks",        "sub_category": "Biskuit",     "brand": "DeliciSnack", "price": 9000},
    {"sku": "SNK-008", "name": "Keripik Tempe 100g",     "category": "Snacks",        "sub_category": "Keripik",     "brand": "SnackNesia",  "price": 5500},
    {"sku": "SNK-009", "name": "Kacang Bawang 150g",     "category": "Snacks",        "sub_category": "Kacang",      "brand": "SnackNesia",  "price": 6500},
    {"sku": "SNK-010", "name": "Permen Buah 50g",        "category": "Snacks",        "sub_category": "Permen",      "brand": "SweetJoy",    "price": 3000},
    {"sku": "SNK-011", "name": "Wafer Stroberi 100g",    "category": "Snacks",        "sub_category": "Wafer",       "brand": "DeliciSnack", "price": 5000},
    {"sku": "SNK-012", "name": "Snack Jagung 100g",      "category": "Snacks",        "sub_category": "Keripik",     "brand": "SnackNesia",  "price": 4500},
    {"sku": "SNK-013", "name": "Biskuit Soda 200g",      "category": "Snacks",        "sub_category": "Biskuit",     "brand": "DeliciSnack", "price": 7500},
    {"sku": "SNK-014", "name": "Keripik Pisang 200g",    "category": "Snacks",        "sub_category": "Keripik",     "brand": "SnackNesia",  "price": 8000},
    {"sku": "SNK-015", "name": "Mochi Kacang 100g",      "category": "Snacks",        "sub_category": "Kue",         "brand": "SweetJoy",    "price": 7000},
    # ── Beverages (12) ────────────────────────────────────────────────────────
    {"sku": "BEV-001", "name": "Minuman Jeruk 250ml",    "category": "Beverages",     "sub_category": "Juice",       "brand": "SegerSegar",  "price": 4000},
    {"sku": "BEV-002", "name": "Teh Manis 330ml",        "category": "Beverages",     "sub_category": "Teh",         "brand": "TehNesia",    "price": 4500},
    {"sku": "BEV-003", "name": "Air Mineral 600ml",      "category": "Beverages",     "sub_category": "Air Mineral", "brand": "AquaNesia",   "price": 3000},
    {"sku": "BEV-004", "name": "Susu Coklat 200ml",      "category": "Beverages",     "sub_category": "Susu",        "brand": "MilkNesia",   "price": 6000},
    {"sku": "BEV-005", "name": "Jus Apel 200ml",         "category": "Beverages",     "sub_category": "Juice",       "brand": "SegerSegar",  "price": 5000},
    {"sku": "BEV-006", "name": "Minuman Soda 330ml",     "category": "Beverages",     "sub_category": "Soda",        "brand": "SodaNesia",   "price": 5000},
    {"sku": "BEV-007", "name": "Teh Hijau 250ml",        "category": "Beverages",     "sub_category": "Teh",         "brand": "TehNesia",    "price": 4500},
    {"sku": "BEV-008", "name": "Air Mineral 1500ml",     "category": "Beverages",     "sub_category": "Air Mineral", "brand": "AquaNesia",   "price": 5000},
    {"sku": "BEV-009", "name": "Minuman Isoton 500ml",   "category": "Beverages",     "sub_category": "Isoton",      "brand": "SegerSegar",  "price": 7000},
    {"sku": "BEV-010", "name": "Kopi Susu 200ml",        "category": "Beverages",     "sub_category": "Kopi",        "brand": "KopiNesia",   "price": 8000},
    {"sku": "BEV-011", "name": "Minuman Mango 250ml",    "category": "Beverages",     "sub_category": "Juice",       "brand": "SegerSegar",  "price": 4500},
    {"sku": "BEV-012", "name": "Teh Lemon 330ml",        "category": "Beverages",     "sub_category": "Teh",         "brand": "TehNesia",    "price": 4500},
    # ── Dairy (8) ─────────────────────────────────────────────────────────────
    {"sku": "DAI-001", "name": "Susu Full Cream 1L",     "category": "Dairy",         "sub_category": "Susu",        "brand": "MilkNesia",   "price": 18000},
    {"sku": "DAI-002", "name": "Susu Skim 1L",           "category": "Dairy",         "sub_category": "Susu",        "brand": "MilkNesia",   "price": 17000},
    {"sku": "DAI-003", "name": "Yogurt Stroberi 150g",   "category": "Dairy",         "sub_category": "Yogurt",      "brand": "YoguNesia",   "price": 12000},
    {"sku": "DAI-004", "name": "Keju Slice 100g",        "category": "Dairy",         "sub_category": "Keju",        "brand": "MilkNesia",   "price": 15000},
    {"sku": "DAI-005", "name": "Mentega 200g",           "category": "Dairy",         "sub_category": "Mentega",     "brand": "MilkNesia",   "price": 14000},
    {"sku": "DAI-006", "name": "Susu Kental Manis 370g", "category": "Dairy",         "sub_category": "Susu",        "brand": "MilkNesia",   "price": 13000},
    {"sku": "DAI-007", "name": "Yogurt Plain 200g",      "category": "Dairy",         "sub_category": "Yogurt",      "brand": "YoguNesia",   "price": 11000},
    {"sku": "DAI-008", "name": "Susu UHT 200ml",         "category": "Dairy",         "sub_category": "Susu",        "brand": "MilkNesia",   "price": 5000},
    # ── Instant Food (10) ─────────────────────────────────────────────────────
    {"sku": "INS-001", "name": "Mie Instan Ayam 85g",    "category": "Instant Food",  "sub_category": "Mie Instan",  "brand": "MiNesia",     "price": 3500},
    {"sku": "INS-002", "name": "Mie Instan Soto 85g",    "category": "Instant Food",  "sub_category": "Mie Instan",  "brand": "MiNesia",     "price": 3500},
    {"sku": "INS-003", "name": "Mie Instan Goreng 85g",  "category": "Instant Food",  "sub_category": "Mie Instan",  "brand": "MiNesia",     "price": 3500},
    {"sku": "INS-004", "name": "Nasi Instan 150g",       "category": "Instant Food",  "sub_category": "Nasi Instan", "brand": "RiceNesia",   "price": 12000},
    {"sku": "INS-005", "name": "Bubur Instan 40g",       "category": "Instant Food",  "sub_category": "Bubur",       "brand": "RiceNesia",   "price": 5000},
    {"sku": "INS-006", "name": "Mie Instan Seafood 85g", "category": "Instant Food",  "sub_category": "Mie Instan",  "brand": "MiNesia",     "price": 4000},
    {"sku": "INS-007", "name": "Sup Instan 30g",         "category": "Instant Food",  "sub_category": "Sup",         "brand": "RiceNesia",   "price": 4000},
    {"sku": "INS-008", "name": "Oatmeal Instan 40g",     "category": "Instant Food",  "sub_category": "Oatmeal",     "brand": "RiceNesia",   "price": 8000},
    {"sku": "INS-009", "name": "Mie Instan Kari 85g",    "category": "Instant Food",  "sub_category": "Mie Instan",  "brand": "MiNesia",     "price": 4000},
    {"sku": "INS-010", "name": "Bihun Instan 70g",       "category": "Instant Food",  "sub_category": "Mie Instan",  "brand": "MiNesia",     "price": 3000},
    # ── Personal Care (5) ─────────────────────────────────────────────────────
    {"sku": "PC-001",  "name": "Sampo 170ml",            "category": "Personal Care", "sub_category": "Rambut",      "brand": "CareNesia",   "price": 15000},
    {"sku": "PC-002",  "name": "Sabun Mandi 85g",        "category": "Personal Care", "sub_category": "Mandi",       "brand": "CareNesia",   "price": 4000},
    {"sku": "PC-003",  "name": "Pasta Gigi 120g",        "category": "Personal Care", "sub_category": "Gigi",        "brand": "CareNesia",   "price": 12000},
    {"sku": "PC-004",  "name": "Sabun Cuci 800g",        "category": "Personal Care", "sub_category": "Cuci",        "brand": "CareNesia",   "price": 22000},
    {"sku": "PC-005",  "name": "Pelembab Tangan 50ml",   "category": "Personal Care", "sub_category": "Pelembab",    "brand": "CareNesia",   "price": 18000},
]

# 10 active promotions — referenced by SKU, resolved to product_id after insert
PROMOS_DEF = [
    {"sku": "SNK-001", "promo_type": "discount", "discount_pct": 15.0, "start_date": "2026-01-15", "end_date": "2026-03-31"},
    {"sku": "SNK-003", "promo_type": "discount", "discount_pct": 10.0, "start_date": "2026-02-01", "end_date": "2026-02-28"},
    {"sku": "SNK-007", "promo_type": "npl",      "discount_pct":  0.0, "start_date": "2026-02-01", "end_date": "2026-04-30"},
    {"sku": "BEV-001", "promo_type": "discount", "discount_pct": 20.0, "start_date": "2026-01-01", "end_date": "2026-03-31"},
    {"sku": "BEV-010", "promo_type": "priority", "discount_pct":  0.0, "start_date": "2026-02-01", "end_date": "2026-03-31"},
    {"sku": "BEV-012", "promo_type": "npl",      "discount_pct":  0.0, "start_date": "2026-02-15", "end_date": "2026-04-30"},
    {"sku": "DAI-003", "promo_type": "discount", "discount_pct": 12.0, "start_date": "2026-01-15", "end_date": "2026-02-28"},
    {"sku": "INS-001", "promo_type": "bundle",   "discount_pct":  0.0, "start_date": "2026-01-01", "end_date": "2026-03-31"},
    {"sku": "INS-006", "promo_type": "discount", "discount_pct":  8.0, "start_date": "2026-02-01", "end_date": "2026-03-31"},
    {"sku": "PC-001",  "promo_type": "npl",      "discount_pct":  0.0, "start_date": "2026-01-15", "end_date": "2026-03-31"},
]

# ── transaction pattern generators ────────────────────────────────────────────

QTY_OPTIONS = {
    "Snacks":        [6, 12, 24, 48],
    "Beverages":     [6, 12, 24, 48],
    "Dairy":         [6, 12, 24],
    "Instant Food":  [12, 24, 48],
    "Personal Care": [6, 12],
}


def _gen(start: date, end: date, interval: tuple[int, int]) -> list[date]:
    dates: list[date] = []
    d = start + timedelta(days=random.randint(0, 10))
    while d <= end:
        dates.append(d)
        d += timedelta(days=random.randint(*interval))
    return dates


def gen_regular() -> list[date]:
    """Buy every 2–3 weeks across the full 6-month window (last purchase is recent)."""
    return _gen(START_DATE, END_DATE, (14, 21))


def gen_inactive() -> list[date]:
    """Regular cadence but stopped 45–70 days before today."""
    stop = TODAY - timedelta(days=random.randint(45, 70))
    return _gen(START_DATE, min(stop, END_DATE), (14, 21))


def gen_declining() -> list[date]:
    """Heavy in first 3 months (Aug–Oct 2025), then mostly stopped."""
    heavy_end = START_DATE + timedelta(days=91)   # ≈ Oct 31 2025
    dates = _gen(START_DATE, heavy_end, (14, 21))
    # One stray late purchase ~35 % of the time
    if random.random() < 0.35:
        extra = heavy_end + timedelta(days=random.randint(30, 60))
        if extra <= END_DATE:
            dates.append(extra)
    return dates


def gen_occasional() -> list[date]:
    """2–3 purchases scattered across the window."""
    span = (END_DATE - START_DATE).days
    return sorted({START_DATE + timedelta(days=random.randint(0, span)) for _ in range(random.randint(2, 3))})


# ── helpers ───────────────────────────────────────────────────────────────────

def upsert_one(table: str, payload: dict, conflict_col: str) -> dict:
    """Upsert a single row and return the resulting record."""
    res = db.table(table).upsert(payload, on_conflict=conflict_col).execute()
    return res.data[0]


def batch_upsert(table: str, records: list[dict], batch_size: int = 500) -> int:
    total = 0
    for i in range(0, len(records), batch_size):
        db.table(table).upsert(records[i : i + batch_size]).execute()
        total += len(records[i : i + batch_size])
    return total


# ── reset helper ──────────────────────────────────────────────────────────────

def reset_tables() -> None:
    print("⚠️   Wiping all tables (child → parent order)…")
    for tbl in ("visits", "recommendations", "transactions", "promotions", "retailers", "salesmen", "products"):
        db.table(tbl).delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()
        print(f"    cleared {tbl}")


# ── main seed ─────────────────────────────────────────────────────────────────

def seed() -> None:
    # ── 1. Salesmen ──────────────────────────────────────────────────────────
    print("\n▸ Salesmen")
    sm_map: dict[str, str] = {}   # code → UUID
    for sm in SALESMEN:
        row = upsert_one("salesmen", sm, "code")
        sm_map[sm["code"]] = row["id"]
        print(f"  ✓ {sm['name']}")

    # ── 2. Retailers ─────────────────────────────────────────────────────────
    print("\n▸ Retailers")
    rt_map: dict[str, str] = {}   # code → UUID
    rt_name_map: dict[str, str] = {}
    for rt in RETAILERS:
        payload = {k: v for k, v in rt.items() if k != "sm"}
        payload["salesman_id"] = sm_map[rt["sm"]]
        row = upsert_one("retailers", payload, "code")
        rt_map[rt["code"]] = row["id"]
        rt_name_map[row["id"]] = rt["name"]
    print(f"  ✓ {len(RETAILERS)} retailers")

    # ── 3. Products ──────────────────────────────────────────────────────────
    print("\n▸ Products")
    pid_map: dict[str, str] = {}     # sku → UUID
    pid_price: dict[str, float] = {} # UUID → price
    pid_cat: dict[str, str] = {}     # UUID → category
    pid_name: dict[str, str] = {}    # UUID → name
    sku_name: dict[str, str] = {}    # sku → name
    for p in PRODUCTS:
        row = upsert_one("products", p, "sku")
        pid_map[p["sku"]] = row["id"]
        pid_price[row["id"]] = p["price"]
        pid_cat[row["id"]] = p["category"]
        pid_name[row["id"]] = p["name"]
        sku_name[p["sku"]] = p["name"]
    print(f"  ✓ {len(PRODUCTS)} products")

    # ── 4. Promotions ────────────────────────────────────────────────────────
    print("\n▸ Promotions")
    promo_pid_set: set[str] = set()
    for promo_def in PROMOS_DEF:
        pid = pid_map[promo_def["sku"]]
        promo_pid_set.add(pid)
        # Check if already exists to avoid duplicates on re-run
        existing = db.table("promotions").select("id").eq("product_id", pid).eq("promo_type", promo_def["promo_type"]).execute()
        if not existing.data:
            payload = {k: v for k, v in promo_def.items() if k != "sku"}
            payload["product_id"] = pid
            payload["is_active"] = True
            db.table("promotions").insert(payload).execute()
    print(f"  ✓ {len(PROMOS_DEF)} active promotions")

    # ── 5. Transactions ──────────────────────────────────────────────────────
    print("\n▸ Transactions  (generating patterns…)")
    all_pids = list(pid_map.values())
    transactions: list[dict] = []

    # Track per-retailer purchase history for later Phase 1 computation
    lp_map: dict[tuple, date | None] = {}         # (rt_id, pid) → last date
    qty_recent: dict[tuple, float] = defaultdict(float)
    qty_older:  dict[tuple, float] = defaultdict(float)
    cutoff_recent = TODAY - timedelta(days=90)
    cutoff_older  = TODAY - timedelta(days=180)

    for rt_code, rt_id in rt_map.items():
        shuffled = all_pids[:]
        random.shuffle(shuffled)

        n_reg  = random.randint(8, 11)
        n_inac = random.randint(2, 3)
        n_decl = random.randint(2, 3)
        n_occ  = random.randint(3, 5)
        n_tot  = n_reg + n_inac + n_decl + n_occ

        selected = shuffled[:n_tot]
        i = 0
        patterns: list[tuple[str, str]] = []
        for pid in selected[i : i + n_reg]:  patterns.append((pid, "regular"));   i += 1
        i = n_reg
        for pid in selected[i : i + n_inac]: patterns.append((pid, "inactive"));  i += 1
        i = n_reg + n_inac
        for pid in selected[i : i + n_decl]: patterns.append((pid, "declining")); i += 1
        i = n_reg + n_inac + n_decl
        for pid in selected[i : i + n_occ]:  patterns.append((pid, "occasional"))

        for pid, pattern in patterns:
            if pattern == "regular":    dates = gen_regular()
            elif pattern == "inactive": dates = gen_inactive()
            elif pattern == "declining":dates = gen_declining()
            else:                       dates = gen_occasional()

            cat = pid_cat[pid]
            qty_opts = QTY_OPTIONS.get(cat, [6, 12, 24])

            for d in dates:
                qty   = random.choice(qty_opts)
                price = pid_price[pid]
                transactions.append(
                    {
                        "retailer_id":      rt_id,
                        "product_id":       pid,
                        "quantity":         qty,
                        "amount":           qty * price,
                        "transaction_date": d.isoformat(),
                    }
                )
                # Build in-memory lookups for Phase 1
                key = (rt_id, pid)
                if lp_map.get(key) is None or d > lp_map[key]:
                    lp_map[key] = d
                if d >= cutoff_recent:
                    qty_recent[key] += qty
                elif d >= cutoff_older:
                    qty_older[key] += qty

    inserted = batch_upsert("transactions", transactions)
    print(f"  ✓ {inserted} transaction rows  ({len(transactions)} generated)")

    # ── 6. Phase 1 Recommendations (computed in-memory — no extra DB round-trips) ──
    print("\n▸ Recommendations  (Phase 1 scoring…)")
    reco_records: list[dict] = []

    for rt_id in rt_map.values():
        # Eligible = promo products ∪ products this retailer has bought
        bought_pids = {pid for (rid, pid) in lp_map if rid == rt_id and lp_map[(rid, pid)] is not None}
        eligible = list(promo_pid_set | bought_pids)

        scored: list[dict] = []
        for pid in eligible:
            key = (rt_id, pid)
            lp  = lp_map.get(key)

            # Signal 1 — recency
            days_inactive = (TODAY - lp).days if lp else 999
            recency = min(days_inactive / 90, 1.0)

            # Signal 2 — promo
            promo = 0.3 if pid in promo_pid_set else 0.0

            # Signal 3 — never bought
            new_bonus = 0.2 if lp is None else 0.0

            # Signal 4 — declining trend
            rq = qty_recent.get(key, 0.0)
            oq = qty_older.get(key, 0.0)
            decline = 0.15 if oq > 0 and rq < oq * 0.7 else 0.0

            score = round(min(recency * 0.5 + promo + new_bonus + decline, 1.0), 3)

            tags = []
            if recency > 0: tags.append("recency_score")
            if promo    > 0: tags.append("promo_boost")
            if new_bonus> 0: tags.append("new_product_bonus")
            if decline  > 0: tags.append("decline_flag")

            scored.append(
                {
                    "retailer_id": rt_id,
                    "product_id":  pid,
                    "score":       score,
                    "rank":        0,
                    "reason_tags": tags,
                    "phase":       "phase1",
                }
            )

        scored.sort(key=lambda x: x["score"], reverse=True)
        for rank, rec in enumerate(scored, 1):
            rec["rank"] = rank

        reco_records.extend(scored)

    batch_upsert("recommendations", reco_records)
    print(f"  ✓ {len(reco_records)} recommendations computed")

    # ── 7. Write sample CSV for upload demo ──────────────────────────────────
    _write_sample_csv(transactions, rt_map, rt_name_map, pid_map, pid_name, sku_name)

    # ── Done ─────────────────────────────────────────────────────────────────
    print("\n✅  Seed complete!")
    print(f"    Salesmen:        {len(SALESMEN)}")
    print(f"    Retailers:       {len(RETAILERS)}")
    print(f"    Products:        {len(PRODUCTS)}")
    print(f"    Promotions:      {len(PROMOS_DEF)}")
    print(f"    Transactions:    {len(transactions)}")
    print(f"    Recommendations: {len(reco_records)}")
    print()
    print("    Demo salesman view: /salesman/<id>  (e.g. Budi Santoso — SM-001)")
    print("    Upload test:        /settings  →  upload  scripts/sample_upload.csv")


# ── sample CSV writer ─────────────────────────────────────────────────────────

def _write_sample_csv(
    transactions: list[dict],
    rt_map: dict[str, str],
    rt_name_map: dict[str, str],
    pid_map: dict[str, str],
    pid_name: dict[str, str],
    sku_name: dict[str, str],
) -> None:
    """Write the last 30 days of transactions as a sample CSV for the upload demo."""
    # Reverse maps
    rt_id_to_code = {v: k for k, v in rt_map.items()}
    pid_to_sku    = {v: k for k, v in pid_map.items()}

    cutoff = (TODAY - timedelta(days=30)).isoformat()
    recent = [t for t in transactions if t["transaction_date"] >= cutoff]

    out_path = os.path.join(os.path.dirname(__file__), "sample_upload.csv")
    with open(out_path, "w", newline="", encoding="utf-8") as fh:
        writer = csv.DictWriter(
            fh,
            fieldnames=["transaction_date", "retailer_code", "retailer_name", "sku", "product_name", "quantity", "amount"],
        )
        writer.writeheader()
        for t in recent:
            rt_id = t["retailer_id"]
            pid   = t["product_id"]
            writer.writerow(
                {
                    "transaction_date": t["transaction_date"],
                    "retailer_code":    rt_id_to_code.get(rt_id, ""),
                    "retailer_name":    rt_name_map.get(rt_id, ""),
                    "sku":              pid_to_sku.get(pid, ""),
                    "product_name":     pid_name.get(pid, ""),
                    "quantity":         int(t["quantity"]),
                    "amount":           int(t["amount"]),
                }
            )

    print(f"\n  ✓ Sample CSV written → scripts/sample_upload.csv  ({len(recent)} rows, last 30 days)")


# ── entry point ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Seed SalesPrompter demo data")
    parser.add_argument(
        "--reset",
        action="store_true",
        help="Delete all existing data before seeding",
    )
    args = parser.parse_args()

    if args.reset:
        confirm = input("⚠️   This will DELETE all data. Type 'yes' to continue: ").strip()
        if confirm.lower() != "yes":
            print("Aborted.")
            sys.exit(0)
        reset_tables()

    seed()
