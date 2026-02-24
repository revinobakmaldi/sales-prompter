"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2, AlertCircle, MapPin, Store } from "lucide-react";
import Link from "next/link";
import { Navbar } from "@/components/shared/Navbar";
import { Footer } from "@/components/shared/Footer";
import { AuthGate } from "@/components/shared/AuthGate";
import { PurchaseHistory } from "@/components/retailers/PurchaseHistory";
import { RecommendationCard } from "@/components/recommendations/RecommendationCard";
import { InsightSummary } from "@/components/recommendations/InsightSummary";
import { fadeInUp, staggerContainer } from "@/lib/animations";
import {
  getRetailer,
  getTransactions,
  getRecommendations,
} from "@/lib/api";
import { tierLabel, tierColor } from "@/lib/utils";
import type { Retailer, Transaction, Recommendation } from "@/lib/types";

export default function RetailerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [retailer, setRetailer] = useState<Retailer | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"recommendations" | "history">(
    "recommendations"
  );

  useEffect(() => {
    if (!id) return;
    async function load() {
      try {
        const [retailerData, txData, recoData] = await Promise.all([
          getRetailer(id),
          getTransactions(id),
          getRecommendations(id),
        ]);
        setRetailer(retailerData);
        setTransactions(txData);
        setRecommendations(recoData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  return (
    <AuthGate>
      <Navbar />
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <Link
          href="/retailers"
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-primary transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to retailers
        </Link>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : error || !retailer ? (
          <div className="flex items-center gap-3 rounded-xl border border-red-200 dark:border-red-800/30 bg-red-500/10 px-5 py-4 text-sm text-red-400">
            <AlertCircle className="h-5 w-5 shrink-0" />
            {error ?? "Retailer not found."}
          </div>
        ) : (
          <>
            {/* Retailer header */}
            <motion.div
              variants={fadeInUp}
              initial="hidden"
              animate="visible"
              className="mb-6 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 p-6"
            >
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                  <Store className="h-6 w-6 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-2xl font-bold text-foreground">
                      {retailer.name}
                    </h1>
                    <span
                      className={`inline-flex items-center rounded border px-2 py-0.5 text-xs ${tierColor(retailer.tier)}`}
                    >
                      {tierLabel(retailer.tier)}
                    </span>
                  </div>
                  <p className="mt-0.5 text-sm text-zinc-500">{retailer.code}</p>
                  <div className="mt-2 flex flex-wrap gap-4 text-sm text-zinc-600 dark:text-zinc-400">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      {retailer.region}
                    </span>
                  </div>
                </div>
              </div>

              {/* Quick stats */}
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 border-t border-zinc-100 dark:border-zinc-800 pt-4">
                <div className="text-center">
                  <p className="text-xl font-bold text-foreground">{recommendations.length}</p>
                  <p className="text-xs text-zinc-500">Recommendations</p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-bold text-foreground">{transactions.length}</p>
                  <p className="text-xs text-zinc-500">Transactions</p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-bold text-foreground">
                    {new Set(transactions.map((t) => t.product_id)).size}
                  </p>
                  <p className="text-xs text-zinc-500">Products bought</p>
                </div>
              </div>
            </motion.div>

            {/* AI Visit Briefing */}
            <InsightSummary retailerId={id} />

            {/* Tab switcher */}
            <div className="mb-4 flex gap-1 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-100/50 dark:bg-zinc-900/50 p-1">
              {(["recommendations", "history"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 rounded-md py-2 text-sm font-medium capitalize transition-all ${
                    activeTab === tab
                      ? "bg-white dark:bg-zinc-800 text-foreground shadow-sm"
                      : "text-zinc-500 hover:text-foreground"
                  }`}
                >
                  {tab === "recommendations"
                    ? `Recommendations (${recommendations.length})`
                    : `Purchase History (${transactions.length})`}
                </button>
              ))}
            </div>

            {/* Tab content */}
            {activeTab === "recommendations" ? (
              recommendations.length === 0 ? (
                <div className="rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 p-10 text-center">
                  <p className="text-sm text-zinc-500">
                    No recommendations yet for this retailer.
                  </p>
                </div>
              ) : (
                <motion.div
                  variants={staggerContainer}
                  initial="hidden"
                  animate="visible"
                  className="space-y-3"
                >
                  {recommendations.map((rec, i) => (
                    <RecommendationCard
                      key={rec.id}
                      recommendation={rec}
                      index={i}
                    />
                  ))}
                </motion.div>
              )
            ) : (
              <motion.div
                variants={fadeInUp}
                initial="hidden"
                animate="visible"
              >
                <PurchaseHistory transactions={transactions} />
              </motion.div>
            )}
          </>
        )}
      </main>
      <Footer />
    </AuthGate>
  );
}
