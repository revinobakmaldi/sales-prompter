import type {
  Salesman,
  Retailer,
  Product,
  Promotion,
  Transaction,
  Recommendation,
  DashboardStats,
  InsightResponse,
} from "./types";

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options);
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data as T;
}

// Auth
export async function verifyPassword(
  password: string
): Promise<{ success: boolean }> {
  return request("/api/auth", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });
}

// Dashboard
export async function getDashboardStats(): Promise<DashboardStats> {
  return request("/api/dashboard");
}

// Salesmen
export async function getSalesmen(): Promise<Salesman[]> {
  return request("/api/salesmen");
}

export async function getSalesman(id: string): Promise<Salesman> {
  return request(`/api/salesmen?id=${id}`);
}

// Retailers
export async function getRetailers(salesmanId?: string): Promise<Retailer[]> {
  const url = salesmanId
    ? `/api/retailers?salesman_id=${salesmanId}`
    : "/api/retailers";
  return request(url);
}

export async function getRetailer(id: string): Promise<Retailer> {
  return request(`/api/retailers?id=${id}`);
}

export async function createRetailer(
  data: Omit<Retailer, "id" | "created_at">
): Promise<Retailer> {
  return request("/api/retailers", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

// Products
export async function getProducts(): Promise<Product[]> {
  return request("/api/products");
}

export async function createProduct(
  data: Omit<Product, "id" | "created_at">
): Promise<Product> {
  return request("/api/products", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

// Promotions
export async function getPromotions(activeOnly = false): Promise<Promotion[]> {
  return request(`/api/promotions${activeOnly ? "?active=true" : ""}`);
}

export async function createPromotion(
  data: Omit<Promotion, "id" | "created_at">
): Promise<Promotion> {
  return request("/api/promotions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export async function updatePromotion(
  id: string,
  data: Partial<Promotion>
): Promise<Promotion> {
  return request(`/api/promotions?id=${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

// Transactions
export async function getTransactions(retailerId: string): Promise<Transaction[]> {
  return request(`/api/transactions?retailer_id=${retailerId}`);
}

export async function uploadTransactionsCsv(
  file: File
): Promise<{ inserted: number; retailers_affected: string[] }> {
  const formData = new FormData();
  formData.append("file", file);
  return request("/api/transactions/upload", {
    method: "POST",
    body: formData,
  });
}

// Salesmen CSV upload
export async function uploadSalesmenCsv(
  file: File
): Promise<{ upserted: number }> {
  const formData = new FormData();
  formData.append("file", file);
  return request("/api/salesmen/upload", {
    method: "POST",
    body: formData,
  });
}

// Retailers CSV upload
export async function uploadRetailersCsv(
  file: File
): Promise<{ upserted: number; warnings: string[] }> {
  const formData = new FormData();
  formData.append("file", file);
  return request("/api/retailers/upload", {
    method: "POST",
    body: formData,
  });
}

// Recommendations
export async function getRecommendations(
  retailerId: string
): Promise<Recommendation[]> {
  return request(`/api/recommendations/${retailerId}`);
}

export async function refreshRecommendations(
  retailerIds?: string[]
): Promise<{ refreshed: number }> {
  return request("/api/recommendations/refresh", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ retailer_ids: retailerIds }),
  });
}

// Insights
export async function getInsightsBatch(
  retailerIds: string[]
): Promise<Record<string, { summary: string; fresh: boolean }>> {
  return request(`/api/insights/batch?retailer_ids=${retailerIds.join(",")}`);
}

export async function getInsight(retailerId: string): Promise<InsightResponse> {
  return request(`/api/insights/${retailerId}`);
}

export async function generateInsight(
  retailerId: string
): Promise<InsightResponse> {
  return request(`/api/insights/${retailerId}`, { method: "POST" });
}

// Model training
export async function triggerModelTrain(): Promise<{ message: string }> {
  return request("/api/model/train", { method: "POST" });
}
