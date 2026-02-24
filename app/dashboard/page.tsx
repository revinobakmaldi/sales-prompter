"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Store,
  Users,
  Tag,
  TrendingUp,
  Loader2,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { Navbar } from "@/components/shared/Navbar";
import { Footer } from "@/components/shared/Footer";
import { AuthGate } from "@/components/shared/AuthGate";
import { fadeInUp, staggerContainer, scaleIn } from "@/lib/animations";
import { getDashboardStats, getProducts, getPromotions } from "@/lib/api";
import type { DashboardStats, Product, Promotion } from "@/lib/types";

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [topProducts, setTopProducts] = useState<Product[]>([]);
  const [activePromos, setActivePromos] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [statsData, productsData, promosData] = await Promise.all([
          getDashboardStats(),
          getProducts(),
          getPromotions(true),
        ]);
        setStats(statsData);
        setTopProducts(productsData.slice(0, 10));
        setActivePromos(promosData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load dashboard");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const statCards = stats
    ? [
        {
          label: "Total Retailers",
          value: stats.total_retailers,
          icon: Store,
          color: "bg-primary/10",
          iconColor: "text-primary",
        },
        {
          label: "Salesmen",
          value: stats.total_salesmen,
          icon: Users,
          color: "bg-secondary/10",
          iconColor: "text-secondary",
        },
        {
          label: "Active Promos",
          value: stats.active_promos,
          icon: Tag,
          color: "bg-amber-500/10",
          iconColor: "text-amber-500",
        },
        {
          label: "Avg Penetration",
          value: `${(stats.avg_penetration_rate * 100).toFixed(1)}%`,
          icon: TrendingUp,
          color: "bg-accent/10",
          iconColor: "text-accent",
        },
      ]
    : [];

  return (
    <AuthGate>
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {/* Header */}
        <motion.div
          variants={fadeInUp}
          initial="hidden"
          animate="visible"
          className="mb-8"
        >
          <h1 className="text-3xl font-bold">
            <span className="bg-gradient-to-r from-zinc-900 via-zinc-700 to-zinc-500 dark:from-zinc-100 dark:via-zinc-300 dark:to-zinc-500 bg-clip-text text-transparent">
              Dashboard
            </span>
          </h1>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            Manager overview — promo execution &amp; product penetration.
          </p>
        </motion.div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="flex items-center gap-3 rounded-xl border border-red-200 dark:border-red-800/30 bg-red-500/10 px-5 py-4 text-sm text-red-400">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <div>
              <p className="font-medium">Failed to load dashboard</p>
              <p className="text-xs mt-0.5 opacity-80">{error}</p>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="ml-auto flex items-center gap-1 text-xs hover:underline"
            >
              <RefreshCw className="h-3 w-3" />
              Retry
            </button>
          </div>
        ) : (
          <>
            {/* Stats grid */}
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
              className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4"
            >
              {statCards.map(({ label, value, icon: Icon, color, iconColor }) => (
                <motion.div
                  key={label}
                  variants={scaleIn}
                  className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 p-5"
                >
                  <div className="flex items-center gap-3">
                    <div className={`rounded-lg p-2.5 ${color}`}>
                      <Icon className={`h-5 w-5 ${iconColor}`} />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground">{value}</p>
                      <p className="text-xs text-zinc-600 dark:text-zinc-400">{label}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>

            <div className="grid gap-6 lg:grid-cols-2">
              {/* Active Promotions */}
              <motion.div
                variants={fadeInUp}
                initial="hidden"
                animate="visible"
                className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 p-5"
              >
                <h2 className="mb-4 text-base font-semibold text-foreground">
                  Active Promotions
                </h2>
                {activePromos.length === 0 ? (
                  <p className="py-4 text-center text-sm text-zinc-500">
                    No active promotions.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {activePromos.slice(0, 8).map((promo) => (
                      <div
                        key={promo.id}
                        className="flex items-center justify-between rounded-lg bg-zinc-50 dark:bg-zinc-800/50 px-3 py-2"
                      >
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {promo.product?.name ?? "Unknown product"}
                          </p>
                          <p className="text-xs text-zinc-500">
                            {promo.product?.sku} · ends {promo.end_date}
                          </p>
                        </div>
                        <span className="text-sm font-semibold text-primary">
                          {promo.promo_type === "discount"
                            ? `${promo.discount_pct}% off`
                            : promo.promo_type.toUpperCase()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>

              {/* Top Products */}
              <motion.div
                variants={fadeInUp}
                initial="hidden"
                animate="visible"
                className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 p-5"
              >
                <h2 className="mb-4 text-base font-semibold text-foreground">
                  Product Catalog (Top 10)
                </h2>
                {topProducts.length === 0 ? (
                  <p className="py-4 text-center text-sm text-zinc-500">
                    No products yet.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {topProducts.map((product) => (
                      <div
                        key={product.id}
                        className="flex items-center justify-between rounded-lg bg-zinc-50 dark:bg-zinc-800/50 px-3 py-2"
                      >
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {product.name}
                          </p>
                          <p className="text-xs text-zinc-500">
                            {product.sku} · {product.brand}
                          </p>
                        </div>
                        <span className="text-xs text-zinc-500">
                          {product.category}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            </div>
          </>
        )}
      </main>
      <Footer />
    </AuthGate>
  );
}
