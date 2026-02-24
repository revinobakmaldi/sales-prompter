-- SalesPrompter — Insights Table
-- One cached LLM-generated visit briefing per retailer.

CREATE TABLE insights (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  retailer_id   UUID NOT NULL UNIQUE REFERENCES retailers(id) ON DELETE CASCADE,
  summary       TEXT NOT NULL,
  model_used    TEXT NOT NULL,
  generated_at  TIMESTAMPTZ DEFAULT now()
);
