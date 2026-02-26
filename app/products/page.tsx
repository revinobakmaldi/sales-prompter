"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Search,
  Loader2,
  Package,
  AlertCircle,
  Tag,
  CheckCircle2,
  XCircle,
  Plus,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { Navbar } from "@/components/shared/Navbar";
import { Footer } from "@/components/shared/Footer";
import { AuthGate } from "@/components/shared/AuthGate";
import { PromoTag } from "@/components/recommendations/PromoTag";
import { fadeInUp, staggerContainer } from "@/lib/animations";
import { getProducts, getPromotions, updatePromotion } from "@/lib/api";
import type { Product, Promotion } from "@/lib/types";

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"products" | "promotions">(
    "products"
  );

  useEffect(() => {
    Promise.all([getProducts(), getPromotions()])
      .then(([prods, promos]) => {
        setProducts(prods);
        setPromotions(promos);
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Failed to load")
      )
      .finally(() => setLoading(false));
  }, []);

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase()) ||
      p.brand.toLowerCase().includes(search.toLowerCase())
  );

  const filteredPromos = promotions.filter(
    (p) =>
      (p.product?.name ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (p.product?.sku ?? "").toLowerCase().includes(search.toLowerCase())
  );

  function daysUntilExpiry(endDate: string | null | undefined): number | null {
    if (!endDate) return null;
    const diff = Math.ceil(
      (new Date(endDate).getTime() - Date.now()) / 86_400_000
    );
    return diff;
  }

  const expiringPromos = promotions.filter((p) => {
    if (!p.is_active || !p.end_date) return false;
    const days = daysUntilExpiry(p.end_date);
    return days !== null && days >= 0 && days <= 7;
  });

  const expiredActivePromos = promotions.filter((p) => {
    if (!p.is_active || !p.end_date) return false;
    const days = daysUntilExpiry(p.end_date);
    return days !== null && days < 0;
  });

  const handleTogglePromo = async (promo: Promotion) => {
    try {
      const updated = await updatePromotion(promo.id, {
        is_active: !promo.is_active,
      });
      setPromotions((prev) =>
        prev.map((p) => (p.id === updated.id ? updated : p))
      );
    } catch {
      // silently fail
    }
  };

  return (
    <AuthGate>
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {/* Header */}
        <motion.div
          variants={fadeInUp}
          initial="hidden"
          animate="visible"
          className="mb-6"
        >
          <h1 className="text-3xl font-bold">
            <span className="bg-gradient-to-r from-zinc-900 via-zinc-700 to-zinc-500 dark:from-zinc-100 dark:via-zinc-300 dark:to-zinc-500 bg-clip-text text-transparent">
              Products &amp; Promotions
            </span>
          </h1>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            {products.length} products · {promotions.filter((p) => p.is_active).length} active promos
          </p>
        </motion.div>

        {/* Search + tab switcher */}
        <motion.div
          variants={fadeInUp}
          initial="hidden"
          animate="visible"
          className="mb-6 flex flex-col gap-3"
        >
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, SKU or brand..."
              className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 py-2.5 pl-9 pr-4 text-sm text-foreground placeholder:text-zinc-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div className="flex gap-1 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-100/50 dark:bg-zinc-900/50 p-1">
            <button
              onClick={() => setActiveTab("products")}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-md py-2 text-sm font-medium transition-all ${
                activeTab === "products"
                  ? "bg-white dark:bg-zinc-800 text-foreground shadow-sm"
                  : "text-zinc-500 hover:text-foreground"
              }`}
            >
              <Package className="h-4 w-4" />
              Products ({filteredProducts.length})
            </button>
            <button
              onClick={() => setActiveTab("promotions")}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-md py-2 text-sm font-medium transition-all ${
                activeTab === "promotions"
                  ? "bg-white dark:bg-zinc-800 text-foreground shadow-sm"
                  : "text-zinc-500 hover:text-foreground"
              }`}
            >
              <Tag className="h-4 w-4" />
              Promotions ({filteredPromos.length})
            </button>
          </div>
        </motion.div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="flex items-center gap-3 rounded-xl border border-red-200 dark:border-red-800/30 bg-red-500/10 px-5 py-4 text-sm text-red-400">
            <AlertCircle className="h-5 w-5 shrink-0" />
            {error}
          </div>
        ) : activeTab === "products" ? (
          filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-20 text-zinc-500">
              <Package className="h-10 w-10 opacity-30" />
              <p className="text-sm">
                {search
                  ? "No products match your search."
                  : "No products yet. Upload transaction data to add products."}
              </p>
            </div>
          ) : (
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
              className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800"
            >
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
                    <th className="px-4 py-3 text-left font-medium text-zinc-600 dark:text-zinc-400">Product</th>
                    <th className="px-4 py-3 text-left font-medium text-zinc-600 dark:text-zinc-400">SKU</th>
                    <th className="px-4 py-3 text-left font-medium text-zinc-600 dark:text-zinc-400">Brand</th>
                    <th className="px-4 py-3 text-left font-medium text-zinc-600 dark:text-zinc-400">Category</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((product, i) => (
                    <motion.tr
                      key={product.id}
                      variants={fadeInUp}
                      custom={i}
                      className="border-b border-zinc-100 dark:border-zinc-800/50 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/30 last:border-b-0"
                    >
                      <td className="px-4 py-3 font-medium text-foreground">
                        {product.name}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-zinc-500">
                        {product.sku}
                      </td>
                      <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                        {product.brand}
                      </td>
                      <td className="px-4 py-3 text-zinc-500 text-xs">
                        {product.category}
                        {product.sub_category
                          ? ` / ${product.sub_category}`
                          : ""}
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </motion.div>
          )
        ) : /* Promotions tab */
        filteredPromos.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-20 text-zinc-500">
            <Tag className="h-10 w-10 opacity-30" />
            <p className="text-sm">
              {search ? "No promotions match your search." : "No promotions yet."}
            </p>
            <button className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-dark">
              <Plus className="h-4 w-4" />
              Add Promotion
            </button>
          </div>
        ) : (
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="space-y-3"
          >
            {/* Expiry alert banners */}
            {expiredActivePromos.length > 0 && (
              <motion.div
                variants={fadeInUp}
                className="flex items-start gap-3 rounded-xl border border-red-200 dark:border-red-800/40 bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-400"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <p className="font-medium">
                    {expiredActivePromos.length} active promo{expiredActivePromos.length > 1 ? "s have" : " has"} already expired
                  </p>
                  <p className="mt-0.5 text-xs text-red-500 dark:text-red-500/80">
                    {expiredActivePromos.map((p) => p.product?.name ?? "Unknown").join(", ")} — consider deactivating.
                  </p>
                </div>
              </motion.div>
            )}
            {expiringPromos.length > 0 && (
              <motion.div
                variants={fadeInUp}
                className="flex items-start gap-3 rounded-xl border border-amber-200 dark:border-amber-800/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-400"
              >
                <Clock className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <p className="font-medium">
                    {expiringPromos.length} promo{expiringPromos.length > 1 ? "s expire" : " expires"} within 7 days
                  </p>
                  <p className="mt-0.5 text-xs text-amber-600 dark:text-amber-500/80">
                    {expiringPromos
                      .map((p) => {
                        const d = daysUntilExpiry(p.end_date);
                        const label = d === 0 ? "today" : d === 1 ? "tomorrow" : `in ${d} days`;
                        return `${p.product?.name ?? "Unknown"} (${label})`;
                      })
                      .join(", ")}
                  </p>
                </div>
              </motion.div>
            )}
            <div className="flex justify-end">
              <button className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-dark">
                <Plus className="h-4 w-4" />
                Add Promotion
              </button>
            </div>
            {filteredPromos.map((promo, i) => (
              <motion.div
                key={promo.id}
                variants={fadeInUp}
                custom={i}
                className="flex items-center justify-between rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-foreground">
                      {promo.product?.name ?? "Unknown product"}
                    </p>
                    <PromoTag promotion={promo} compact />
                    {!promo.is_active && (
                      <span className="rounded border border-zinc-300 dark:border-zinc-600 px-1.5 py-0.5 text-xs text-zinc-400">
                        Inactive
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-500 mt-0.5 flex flex-wrap items-center gap-1.5">
                    <span>{promo.product?.sku} · {promo.start_date} → {promo.end_date}</span>
                    {(() => {
                      const days = daysUntilExpiry(promo.end_date);
                      if (days === null) return null;
                      if (days < 0 && promo.is_active)
                        return (
                          <span className="inline-flex items-center gap-1 rounded border border-red-300 dark:border-red-700/50 bg-red-500/10 px-1.5 py-0.5 text-xs font-medium text-red-600 dark:text-red-400">
                            <AlertTriangle className="h-3 w-3" />
                            Expired
                          </span>
                        );
                      if (days <= 2 && promo.is_active)
                        return (
                          <span className="inline-flex items-center gap-1 rounded border border-red-200 dark:border-red-800/30 bg-red-500/10 px-1.5 py-0.5 text-xs font-medium text-red-500 dark:text-red-400">
                            <Clock className="h-3 w-3" />
                            {days === 0 ? "Expires today" : days === 1 ? "Expires tomorrow" : `Expires in ${days}d`}
                          </span>
                        );
                      if (days <= 7 && promo.is_active)
                        return (
                          <span className="inline-flex items-center gap-1 rounded border border-amber-200 dark:border-amber-800/30 bg-amber-500/10 px-1.5 py-0.5 text-xs font-medium text-amber-600 dark:text-amber-400">
                            <Clock className="h-3 w-3" />
                            {`Expires in ${days}d`}
                          </span>
                        );
                      return null;
                    })()}
                  </p>
                </div>
                <button
                  onClick={() => handleTogglePromo(promo)}
                  className={`ml-4 shrink-0 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
                    promo.is_active
                      ? "border-red-200 dark:border-red-800/30 text-red-400 hover:bg-red-500/10"
                      : "border-primary/30 text-primary hover:bg-primary/10"
                  }`}
                >
                  {promo.is_active ? (
                    <span className="flex items-center gap-1">
                      <XCircle className="h-3.5 w-3.5" />
                      Deactivate
                    </span>
                  ) : (
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Activate
                    </span>
                  )}
                </button>
              </motion.div>
            ))}
          </motion.div>
        )}
      </main>
      <Footer />
    </AuthGate>
  );
}
