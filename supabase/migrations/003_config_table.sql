-- Config table — stores app-level key-value configuration (e.g. scoring weights).
CREATE TABLE config (
  key        TEXT PRIMARY KEY,
  value      JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Seed default scoring weights
INSERT INTO config (key, value) VALUES (
  'scoring_weights',
  '{"recency_weight": 0.50, "promo_boost": 0.30, "new_product_bonus": 0.20, "decline_flag": 0.15, "decline_threshold": 0.70}'
);
