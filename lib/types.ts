export interface Salesman {
  id: string;
  name: string;
  code: string;
  region: string;
  created_at: string;
}

export interface Retailer {
  id: string;
  name: string;
  code: string;
  region: string;
  tier: "small" | "medium" | "large";
  salesman_id: string;
  created_at: string;
  salesman?: Salesman;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  category: string;
  sub_category: string;
  brand: string;
  price: number;
  created_at: string;
}

export interface Promotion {
  id: string;
  product_id: string;
  promo_type: "discount" | "npl" | "bundle" | "priority";
  discount_pct: number;
  start_date: string;
  end_date: string;
  is_active: boolean;
  created_at: string;
  product?: Product;
}

export interface Transaction {
  id: string;
  retailer_id: string;
  product_id: string;
  quantity: number;
  amount: number;
  transaction_date: string;
  created_at: string;
  product?: Product;
}

export type ReasonTag =
  | "recency_score"
  | "promo_boost"
  | "new_product_bonus"
  | "decline_flag"
  | "cf_signal";

export const REASON_LABELS: Record<ReasonTag, string> = {
  recency_score: "Inactive 30+ days",
  promo_boost: "Active promo",
  new_product_bonus: "Never tried before",
  decline_flag: "Order frequency declining",
  cf_signal: "Similar retailers buy this",
};

export interface Recommendation {
  id: string;
  retailer_id: string;
  product_id: string;
  score: number;
  rank: number;
  reason_tags: ReasonTag[];
  phase: "phase1" | "phase2";
  generated_at: string;
  product?: Product;
  promotion?: Promotion;
}

export interface Visit {
  id: string;
  salesman_id: string;
  retailer_id: string;
  visited_at: string;
  products_pitched: string[];
  notes: string;
}

export interface Insight {
  id: string;
  retailer_id: string;
  summary: string;
  model_used: string;
  generated_at: string;
}

export interface InsightResponse {
  insight: Insight | null;
  fresh: boolean;
}

export interface DashboardStats {
  total_retailers: number;
  total_salesmen: number;
  active_promos: number;
  avg_penetration_rate: number;
}
