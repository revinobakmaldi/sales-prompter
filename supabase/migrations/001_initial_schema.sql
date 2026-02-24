-- SalesPrompter — Initial Schema
-- Run this migration in your Supabase SQL editor.

-- ============================================================
-- Salesmen
-- ============================================================
CREATE TABLE salesmen (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name        TEXT NOT NULL,
  code        TEXT UNIQUE,
  region      TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- Retailers
-- ============================================================
CREATE TABLE retailers (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name        TEXT NOT NULL,
  code        TEXT UNIQUE,
  region      TEXT,
  tier        TEXT CHECK (tier IN ('small', 'medium', 'large')),
  salesman_id UUID REFERENCES salesmen(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- Products
-- ============================================================
CREATE TABLE products (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sku          TEXT UNIQUE NOT NULL,
  name         TEXT NOT NULL,
  category     TEXT,
  sub_category TEXT,
  brand        TEXT,
  price        NUMERIC(12, 2),
  created_at   TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- Promotions / NPL List
-- ============================================================
CREATE TABLE promotions (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id   UUID REFERENCES products(id) ON DELETE CASCADE,
  promo_type   TEXT CHECK (promo_type IN ('discount', 'npl', 'bundle', 'priority')),
  discount_pct NUMERIC(5, 2),
  start_date   DATE,
  end_date     DATE,
  is_active    BOOLEAN DEFAULT true,
  created_at   TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- Purchase Transactions
-- ============================================================
CREATE TABLE transactions (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  retailer_id      UUID REFERENCES retailers(id) ON DELETE CASCADE,
  product_id       UUID REFERENCES products(id) ON DELETE CASCADE,
  quantity         NUMERIC(10, 2),
  amount           NUMERIC(14, 2),
  transaction_date DATE NOT NULL,
  created_at       TIMESTAMPTZ DEFAULT now(),
  -- Deduplication: one aggregate record per retailer-product-day
  UNIQUE (retailer_id, product_id, transaction_date)
);

CREATE INDEX idx_transactions_retailer ON transactions (retailer_id);
CREATE INDEX idx_transactions_product  ON transactions (product_id);
CREATE INDEX idx_transactions_date     ON transactions (transaction_date);

-- ============================================================
-- Recommendations (cached engine output)
-- ============================================================
CREATE TABLE recommendations (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  retailer_id  UUID REFERENCES retailers(id) ON DELETE CASCADE,
  product_id   UUID REFERENCES products(id) ON DELETE CASCADE,
  score        NUMERIC(5, 3),           -- 0.000 – 1.000
  rank         INTEGER,                 -- 1 = highest priority
  reason_tags  JSONB,                   -- e.g. ["recency_score","promo_boost"]
  phase        TEXT CHECK (phase IN ('phase1', 'phase2')),
  generated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (retailer_id, product_id)
);

CREATE INDEX idx_recommendations_retailer ON recommendations (retailer_id);

-- ============================================================
-- Visit Logs
-- ============================================================
CREATE TABLE visits (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  salesman_id      UUID REFERENCES salesmen(id) ON DELETE SET NULL,
  retailer_id      UUID REFERENCES retailers(id) ON DELETE CASCADE,
  visited_at       TIMESTAMPTZ DEFAULT now(),
  products_pitched JSONB,   -- array of product_ids pitched
  notes            TEXT
);

CREATE INDEX idx_visits_salesman ON visits (salesman_id);
CREATE INDEX idx_visits_retailer ON visits (retailer_id);
