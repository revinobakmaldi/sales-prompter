# SalesPrompter — Development Plan
> Next Best Product to Offer Engine for Distributor Salesmen
> Author: Revino B Akmaldi | Version: 1.0

---

## 1. Product Overview

**SalesPrompter** is a web-based platform that helps distributor salesmen know exactly which products to prioritize when visiting a retailer. Instead of memorizing a long promotion list, the salesman gets a short, personalized "Top 3–5 Products to Push Today" for each retailer — derived from purchase history, promo eligibility, and behavioral patterns.

### Core Value Proposition
- **For Salesmen:** Less cognitive load, more confidence in the field
- **For Sales Managers:** Better promo execution, measurable product penetration
- **For Distributor Owners:** ROI visibility on promo budget

---

## 2. Tech Stack

Mirrors the design language and stack from **resume-lens** for brand consistency.

| Layer | Technology |
|-------|------------|
| Frontend | Next.js (App Router, Turbopack) |
| Styling | Tailwind CSS v4, Geist font, Framer Motion, Lucide React |
| Backend | Python serverless functions (Vercel) |
| ML Engine | `implicit` (ALS), `LightFM`, `scikit-learn` |
| Database | Supabase Postgres |
| Auth | Password gate via environment variable (same as resume-lens) |
| Deployment | Vercel |
| LLM (optional) | OpenRouter API — for natural language insight generation |

---

## 3. Design System (Resume-Lens Consistency)

Copy the following directly from resume-lens:

**From `/components/shared/`:**
- `Navbar` — top navigation bar
- `Footer` — bottom footer
- `Background` — animated Dark/light background component
- Auth gate (password protection pattern)

**Design tokens to preserve:**
- Font: Geist (sans + mono)
- Dark/light mode toggle via system preference
- Framer Motion page transitions
- Lucide React icon set
- Tailwind CSS v4 utility classes
- Color palette: inherit from resume-lens globals

**New components to build** (following same design style):
- `RetailerCard` — retailer summary with visit context
- `RecommendationCard` — product recommendation with reason badge
- `ScoreBadge` — confidence score chip (reuse pattern from resume-lens ScoreBadge)
- `PromoTag` — highlight active promo/NPL status
- `InsightPanel` — why this product is recommended
- `SalesmanView` — mobile-optimized field view

---

## 4. Application Architecture

```
salespromter/
├── api/                          # Python serverless functions
│   ├── auth.py                   # Password validation (copy from resume-lens)
│   ├── retailers.py              # CRUD retailers
│   ├── products.py               # CRUD products + promo list
│   ├── transactions.py           # Ingest + query purchase history
│   ├── recommendations.py        # Core recommendation engine
│   ├── rules.py                  # Business rules engine
│   └── insights.py               # LLM insight generation (optional)
├── app/                          # Next.js App Router
│   ├── page.tsx                  # Login (copy from resume-lens)
│   ├── dashboard/                # Manager dashboard — KPIs + overview
│   ├── retailers/                # Retailer list + detail
│   ├── salesman/                 # Salesman field view (mobile-first)
│   ├── products/                 # Product catalog + promo management
│   └── settings/                 # Config, data upload, model retraining
├── components/
│   ├── shared/                   # Navbar, footer, auth, background (from resume-lens)
│   ├── retailers/                # RetailerCard, filters, detail
│   ├── recommendations/          # RecommendationCard, InsightPanel, PromoTag
│   ├── salesman/                 # SalesmanView, VisitChecklist
│   └── upload/                   # CSV dropzone (adapt from resume-lens upload/)
└── lib/                          # Types, API wrappers, utilities
```

---

## 5. Database Schema

```sql
-- Retailers
CREATE TABLE retailers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT UNIQUE,
  region TEXT,
  tier TEXT,                        -- 'small', 'medium', 'large'
  salesman_id UUID REFERENCES salesmen(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Salesmen
CREATE TABLE salesmen (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT UNIQUE,
  region TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Products
CREATE TABLE products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sku TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  category TEXT,
  sub_category TEXT,
  brand TEXT,
  price NUMERIC(12,2),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Promotions / NPL List
CREATE TABLE promotions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  promo_type TEXT,                  -- 'discount', 'npl', 'bundle', 'priority'
  discount_pct NUMERIC(5,2),
  start_date DATE,
  end_date DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Purchase Transactions
CREATE TABLE transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  retailer_id UUID REFERENCES retailers(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  quantity NUMERIC(10,2),
  amount NUMERIC(14,2),
  transaction_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_transactions_retailer ON transactions(retailer_id);
CREATE INDEX idx_transactions_date ON transactions(transaction_date);

-- Recommendations (cached output)
CREATE TABLE recommendations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  retailer_id UUID REFERENCES retailers(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  score NUMERIC(5,3),               -- 0.000 to 1.000
  rank INTEGER,                     -- 1 = top priority
  reason_tags JSONB,                -- ['inactive_30d', 'promo_available', 'cf_signal']
  phase TEXT,                       -- 'phase1' or 'phase2'
  generated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(retailer_id, product_id)
);
CREATE INDEX idx_recommendations_retailer ON recommendations(retailer_id);

-- Visit Logs
CREATE TABLE visits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  salesman_id UUID REFERENCES salesmen(id),
  retailer_id UUID REFERENCES retailers(id),
  visited_at TIMESTAMPTZ DEFAULT now(),
  products_pitched JSONB,           -- array of product_ids pitched
  notes TEXT
);
```

---

## 6. Phase 1 — Rule-Based Engine

**Goal:** Fast to build, immediately valuable, no ML complexity required.

### Logic Pipeline (`api/recommendations.py` — Phase 1)

For each retailer, score each **active promo product** using rule signals:

```python
def phase1_score(retailer_id: str, product_id: str, db) -> dict:
    signals = {}

    # Signal 1: Days since last purchase (recency)
    last_purchase = get_last_purchase_date(retailer_id, product_id, db)
    days_inactive = (today - last_purchase).days if last_purchase else 999
    signals['recency_score'] = min(days_inactive / 90, 1.0)  # Max at 90 days

    # Signal 2: Is product in active promo/NPL?
    promo = get_active_promo(product_id, db)
    signals['promo_boost'] = 0.3 if promo else 0.0

    # Signal 3: Has retailer NEVER bought this product?
    never_bought = check_never_purchased(retailer_id, product_id, db)
    signals['new_product_bonus'] = 0.2 if never_bought else 0.0

    # Signal 4: Declining order frequency (bought before, but less recently)
    trend = get_order_trend(retailer_id, product_id, db)
    signals['decline_flag'] = 0.15 if trend == 'declining' else 0.0

    # Final score
    total = (
        signals['recency_score'] * 0.50 +
        signals['promo_boost'] +
        signals['new_product_bonus'] +
        signals['decline_flag']
    )
    
    return {
        'score': round(total, 3),
        'reason_tags': [k for k, v in signals.items() if v > 0],
        'phase': 'phase1'
    }
```

### Phase 1 Output for Salesman
- Top 5 products ranked by score
- Human-readable reason per product: `"Hasn't ordered in 45 days"`, `"Active discount available"`, `"New product — never tried"`
- Promo badge if applicable

---

## 7. Phase 2 — ML Recommendation Engine

**Goal:** Add collaborative filtering to surface cross-retailer patterns.

### Model: ALS (Alternating Least Squares) via `implicit`

```python
import implicit
import numpy as np
from scipy.sparse import csr_matrix

def train_als_model(transactions_df):
    # Build retailer-product interaction matrix
    # Value = purchase frequency (implicit signal)
    retailer_ids = transactions_df['retailer_id'].astype('category')
    product_ids = transactions_df['product_id'].astype('category')
    
    counts = transactions_df.groupby(
        ['retailer_id', 'product_id']
    )['quantity'].sum().reset_index()
    
    matrix = csr_matrix((
        counts['quantity'].values,
        (counts['retailer_id'].cat.codes, counts['product_id'].cat.codes)
    ))
    
    model = implicit.als.AlternatingLeastSquares(
        factors=50,
        regularization=0.01,
        iterations=30
    )
    model.fit(matrix)
    return model, retailer_ids, product_ids

def get_cf_recommendations(model, retailer_idx, n=10):
    ids, scores = model.recommend(
        retailer_idx,
        user_items=None,
        N=n,
        filter_already_liked_items=False
    )
    return ids, scores
```

### Hybrid Scoring (Phase 2)

```
Final Score = (Phase1 Rule Score × 0.5) + (CF Score × 0.3) + (Promo Boost × 0.2)
```

This blends explainability from Phase 1 rules with the pattern discovery from CF.

### Model Retraining
- Scheduled via Vercel cron (weekly) or manual trigger from Settings page
- Model artifacts stored in Supabase Storage or environment-level cache
- Fallback to Phase 1 if CF model not available (cold start safety net)

---

## 8. Frontend — Key Pages & Components

### 8.1 Login Page (`app/page.tsx`)
- **Copy directly from resume-lens** — same password gate pattern
- Update branding: product name → SalesPrompter

### 8.2 Dashboard (`app/dashboard/`)
Manager-level overview:
- Total retailers, salesmen, active promos
- Product penetration rate (% of retailers buying a product)
- Top 10 underperforming promo products
- Region heatmap (future)

### 8.3 Salesman Field View (`app/salesman/[id]/`)
**This is the most important screen — mobile-first, dead simple:**

```
┌─────────────────────────────────┐
│ 👤 Salesman: Budi               │
│ 📍 Visiting: Toko Maju Jaya     │
├─────────────────────────────────┤
│ 🔥 TODAY'S PRIORITY PRODUCTS    │
├─────────────────────────────────┤
│ #1  Wafer Coklat 100g           │
│     💡 Inactive 42 days         │
│     🏷️ Active promo: 15% disc   │
│     Score: 0.89                 │
├─────────────────────────────────┤
│ #2  Biskuit Susu 200g           │
│     💡 Never ordered before     │
│     Score: 0.74                 │
├─────────────────────────────────┤
│ #3  Minuman Jeruk 250ml         │
│     💡 Similar retailers buy    │
│     Score: 0.68                 │
└─────────────────────────────────┘
```

### 8.4 Retailer Detail (`app/retailers/[id]/`)
- Purchase history table (sortable, filterable — adapt from resume-lens candidate table)
- All-time product breakdown
- Recommendation history

### 8.5 Product & Promo Management (`app/products/`)
- Product catalog with search/filter
- Promo list CRUD (add/edit/deactivate promos)
- Bulk CSV upload (adapt dropzone from resume-lens)

### 8.6 Settings (`app/settings/`)
- CSV data upload for transaction history
- Model retraining trigger
- Config: scoring weights, rule thresholds

---

## 9. API Endpoints

### Python Serverless Functions

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth` | POST | Password validation |
| `/api/retailers` | GET, POST | List / create retailers |
| `/api/retailers/[id]` | GET, PUT, DELETE | Retailer CRUD |
| `/api/products` | GET, POST | List / create products |
| `/api/promotions` | GET, POST, PUT | Promo list management |
| `/api/transactions/upload` | POST | Bulk CSV ingest |
| `/api/recommendations/[retailer_id]` | GET | Get top-N recommendations for retailer |
| `/api/recommendations/refresh` | POST | Trigger recommendation recalculation |
| `/api/model/train` | POST | Trigger ALS model retraining |
| `/api/salesmen` | GET, POST | Salesman management |
| `/api/visits` | POST | Log a salesman visit |

---

## 10. Data Ingestion (CSV Upload)

Clients provide transaction data via CSV. Expected format:

```csv
transaction_date,retailer_code,retailer_name,sku,product_name,quantity,amount
2024-01-15,RT001,Toko Maju Jaya,SKU-001,Wafer Coklat 100g,24,120000
2024-01-15,RT001,Toko Maju Jaya,SKU-002,Biskuit Susu 200g,12,84000
```

The upload API (`/api/transactions/upload`) handles:
1. CSV parsing + validation
2. Auto-create retailers/products if not exist
3. Deduplicate by `(retailer_code, sku, transaction_date)`
4. Trigger recommendation refresh after upload

---

## 11. Project Structure (File Tree)

```
salespromter/
├── api/
│   ├── auth.py
│   ├── retailers.py
│   ├── products.py
│   ├── promotions.py
│   ├── transactions.py
│   ├── recommendations.py          # Phase 1 + Phase 2 engine
│   ├── model_train.py              # ALS training script
│   ├── rules.py                    # Rule signal functions
│   └── insights.py                 # LLM reason generation (optional)
├── app/
│   ├── page.tsx                    # Login (from resume-lens)
│   ├── layout.tsx
│   ├── globals.css
│   ├── dashboard/
│   │   └── page.tsx
│   ├── salesman/
│   │   └── [id]/page.tsx           # Field view — CORE SCREEN
│   ├── retailers/
│   │   ├── page.tsx
│   │   └── [id]/page.tsx
│   ├── products/
│   │   └── page.tsx
│   └── settings/
│       └── page.tsx
├── components/
│   ├── shared/
│   │   ├── Navbar.tsx              # From resume-lens
│   │   ├── Footer.tsx              # From resume-lens
│   │   ├── Background.tsx          # From resume-lens
│   │   └── AuthGate.tsx            # From resume-lens
│   ├── recommendations/
│   │   ├── RecommendationCard.tsx
│   │   ├── InsightPanel.tsx
│   │   └── PromoTag.tsx
│   ├── retailers/
│   │   ├── RetailerCard.tsx
│   │   ├── RetailerTable.tsx
│   │   └── PurchaseHistory.tsx
│   ├── salesman/
│   │   └── SalesmanView.tsx        # Mobile-optimized field view
│   └── upload/
│       └── CsvDropzone.tsx         # Adapted from resume-lens upload/
├── lib/
│   ├── types.ts
│   ├── api.ts
│   └── utils.ts
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql
├── requirements.txt
├── pyproject.toml
├── package.json
├── next.config.ts
├── tsconfig.json
├── vercel.json
└── .env.local.example
```

---

## 12. Environment Variables

```env
# Supabase
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOi...

# Auth (same pattern as resume-lens)
APP_PASSWORD=your-chosen-password

# Optional: LLM for insight generation
OPENROUTER_API_KEY=sk-or-...
```

---

## 13. Development Phases & Milestones

### Milestone 1 — Foundation (Week 1–2)
- [ ] Project scaffold (Next.js + Tailwind v4 + Supabase)
- [ ] Copy shared components from resume-lens (Navbar, Footer, Background, AuthGate)
- [ ] Database schema migration
- [ ] Auth gate working
- [ ] Product + Retailer CRUD APIs

### Milestone 2 — Data Ingestion (Week 2–3)
- [ ] CSV upload with validation
- [ ] Transaction data ingestion API
- [ ] Promo/NPL management (CRUD)
- [ ] Basic product catalog UI

### Milestone 3 — Phase 1 Engine (Week 3–4)
- [ ] Rule-based scoring (`recency`, `promo_boost`, `new_product_bonus`, `decline_flag`)
- [ ] Recommendation API (`/api/recommendations/[retailer_id]`)
- [ ] Salesman field view — mobile-first (CORE SCREEN)
- [ ] Reason tag display

### Milestone 4 — Phase 2 Engine (Week 4–6)
- [ ] ALS model training script
- [ ] Hybrid scoring (rules + CF)
- [ ] Model retraining trigger in Settings
- [ ] Fallback to Phase 1 if model not available

### Milestone 5 — Polish & Deploy (Week 6–7)
- [ ] Manager dashboard with KPIs
- [ ] Retailer detail + purchase history
- [ ] Framer Motion transitions
- [ ] Dark/light mode
- [ ] Vercel deployment
- [ ] Seed data + demo mode

---

## 14. Key Technical Notes for the Developer

1. **Reuse aggressively from resume-lens.** The auth pattern, background, navbar, footer, upload dropzone pattern, and table component patterns should all be directly adapted.

2. **Salesman view is mobile-first.** Use `max-w-md mx-auto` container, large touch targets, minimal text. The salesman is in the field on a phone.

3. **Phase 1 runs on every request** (lightweight, rule queries on Postgres). Phase 2 recommendations are **pre-computed and cached** in the `recommendations` table, refreshed weekly or on-demand.

4. **Cold start handling:** If a retailer has fewer than 3 transactions, skip CF entirely and use Phase 1 only.

5. **Python dependencies:**
```
implicit==0.7.2
scikit-learn>=1.3
pandas>=2.0
scipy>=1.11
supabase>=2.0
```

6. **Recommendation refresh flow:**
   - After CSV upload → trigger Phase 1 recalculation for affected retailers
   - Weekly cron (Vercel) → retrain ALS model → update Phase 2 scores for all retailers

7. **Reason tags are human-readable.** Map tags to UI strings:
   - `inactive_30d` → "Hasn't ordered in 30+ days"
   - `promo_available` → "Active discount available"
   - `never_purchased` → "New product — never tried"
   - `declining_trend` → "Order frequency declining"
   - `cf_signal` → "Similar retailers buy this"

---

## 15. Demo / First Client Pitch

For the first client demo, prepare:
- Seed data: 20 retailers, 50 products, 6 months of synthetic transactions, 10 active promos
- Demo salesman account with 5 retailers in their territory
- Show the before/after: "Here's your 50-product promo list" vs "Here are your top 3 for this retailer"
- Measurable claim: track product penetration rate before/after deployment

---

*Built by Revino B Akmaldi — SalesPrompter v1.0*
