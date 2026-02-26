# SalesPrompter

> Next Best Product to Offer Engine for Distributor Salesmen

SalesPrompter helps distributor salesmen know exactly which products to prioritize when visiting a retailer. Instead of memorizing a long promotion list, each salesman gets a personalized **Top 3–5 Products to Push Today** for each retailer — derived from purchase history, promo eligibility, and behavioral patterns.

---

## Why It Exists

| Who | Benefit |
|-----|---------|
| Salesmen | Less cognitive load, more confidence in the field |
| Sales Managers | Better promo execution, measurable product penetration |
| Distributor Owners | ROI visibility on promo budget |

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 16 (App Router, Turbopack) |
| Styling | Tailwind CSS v4, Framer Motion, Lucide React |
| Backend | Python Flask (local) |
| ML Engine | `implicit` (ALS), `scikit-learn` |
| Database | Supabase Postgres |
| Auth | Password gate via environment variable |
| Deployment | Vercel (frontend), local Flask server (backend) |
| LLM | OpenRouter API (Qwen) — visit briefing insights |

---

## How It Works

### Phase 1 — Rule-Based Engine
Scores each product per retailer using four signals:
- **Recency** — days since last purchase
- **Promo boost** — product has an active discount/NPL
- **New product bonus** — retailer has never ordered this product
- **Decline flag** — order frequency is trending down

### Phase 2 — ML Hybrid Engine
Adds collaborative filtering (ALS) to surface cross-retailer patterns. Final score blends rules + CF:

```
Final Score = (Rule Score × 0.5) + (CF Score × 0.3) + (Promo Boost × 0.2)
```

Phase 1 runs on every request. Phase 2 scores are pre-computed, cached in Postgres, and refreshed weekly.

### LLM-Powered Visit Briefings

Each retailer detail page includes an AI-generated **visit briefing** — a concise 3–4 sentence summary telling the salesman exactly what to focus on. Powered by OpenRouter (Qwen), the insight highlights:
- The single most important action for this visit
- Active promotions the salesman should mention
- Declining or new-to-retailer products worth pushing

Insights are cached in the `insights` table and flagged as stale when recommendations are refreshed.

### Salesman-Centric View

A dedicated **salesman selector** (`/salesman`) lets each salesman pick their profile and see a personalized dashboard with:
- **Visit plan cards** — each retailer shows tier, top 3 recommended products, and an AI briefing preview
- **Search & filter** — find retailers by name, code, or region; filter by tier (Gold/Silver/Bronze)
- **Batch insights** — briefings are loaded in bulk to avoid slow N+1 requests

### Promotions Management

A full-featured **promotions page** (`/promotions`) provides complete CRUD operations:
- **Create / edit** promotions via a slide-in modal with product picker, type selector (discount, NPL, bundle, priority), discount %, date range, and active toggle
- **Delete** with confirmation dialog
- **Filter tabs** — All, Active, Inactive, Expiring Soon (with counts)
- **Expiry alerts** — banner warnings for expired and soon-to-expire promos, plus per-card badges with countdowns

---

## Project Structure

```
sales-prompter/
├── api/                  # Python Flask API modules
│   ├── auth.py
│   ├── retailers.py
│   ├── products.py
│   ├── promotions.py
│   ├── transactions.py
│   ├── recommendations.py
│   ├── insights.py
│   ├── model_train.py
│   ├── salesmen.py
│   ├── dashboard.py
│   └── visits.py
├── server.py             # Local dev server (combines all Flask apps)
├── app/                  # Next.js App Router pages
│   ├── page.tsx          # Login
│   ├── dashboard/        # Manager KPI overview
│   ├── salesman/         # Salesman selector page
│   ├── salesman/[id]/    # Field view (mobile-first — core screen)
│   ├── retailers/        # Retailer list + detail
│   ├── products/         # Product catalog
│   ├── promotions/       # Promotions management (CRUD, filters, expiry alerts)
│   └── settings/         # CSV upload (transactions, salesmen, retailers), model retraining
├── components/
│   ├── shared/           # Navbar, Footer, Background, AuthGate
│   ├── recommendations/  # RecommendationCard, InsightPanel, PromoTag, ScoreBadge
│   ├── retailers/        # RetailerCard, PurchaseHistory
│   ├── salesman/         # SalesmanView, RetailerVisitCard (mobile-optimized)
│   └── upload/           # CsvDropzone
├── lib/                  # Types, API wrappers, utilities
└── supabase/
    └── migrations/       # Database schema
```

---

## Getting Started

### Prerequisites
- Node.js 18+
- Python 3.11+
- A [Supabase](https://supabase.com) project

### 1. Clone & install

```bash
git clone https://github.com/revinobakmaldi/sales-prompter.git
cd sales-prompter
npm install
uv sync --extra ml    # Python deps (requires uv)
```

### 2. Configure environment

```bash
cp .env.local.example .env.local
```

Fill in your values:

```env
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOi...
APP_PASSWORD=your-chosen-password
OPENROUTER_API_KEY=sk-or-...   # required for visit briefing insights
```

### 3. Run database migrations

Run the SQL in `supabase/migrations/001_initial_schema.sql` against your Supabase project.

### 4. Start the dev servers

**Terminal 1 — Flask backend (port 5328):**
```bash
uv run python server.py
```

**Terminal 2 — Next.js frontend (port 3000):**
```bash
npm run dev
```

The Next.js dev server proxies `/api/*` requests to Flask automatically.

---

## Data Ingestion

Upload data via CSV from the Settings page. Three upload types are supported:

**Transactions:**
```csv
transaction_date,retailer_code,retailer_name,sku,product_name,quantity,amount
2024-01-15,RT001,Toko Maju Jaya,SKU-001,Wafer Coklat 100g,24,120000
```

**Salesmen:**
```csv
code,name
SM001,Budi Santoso
```

**Retailers:**
```csv
code,name,salesman_code,tier
RT001,Toko Maju Jaya,SM001,Gold
```

The upload APIs auto-create related records, deduplicate on upsert, and warn about unmatched references (e.g. unknown salesman codes).

---

## Deployment

The Next.js frontend is deployed on Vercel. Push to `main` to deploy. The Python backend runs locally.

```bash
vercel --prod   # frontend only
```

---

*Built by Revino B Akmaldi — SalesPrompter v1.0*
