"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { User, MapPin, RefreshCw, Loader2 } from "lucide-react";
import { staggerContainer, fadeInUp } from "@/lib/animations";
import { RetailerVisitCard } from "@/components/salesman/RetailerVisitCard";
import type { Salesman, Retailer, Recommendation } from "@/lib/types";
import { refreshRecommendations } from "@/lib/api";

interface SalesmanViewProps {
  salesman: Salesman;
  retailers: Retailer[];
  recommendationsByRetailer: Record<string, Recommendation[]>;
  insightsByRetailer: Record<string, { summary: string; fresh: boolean }>;
}

export function SalesmanView({
  salesman,
  retailers,
  recommendationsByRetailer,
  insightsByRetailer,
}: SalesmanViewProps) {
  const [refreshing, setRefreshing] = useState(false);

  const handleRefreshAll = async () => {
    setRefreshing(true);
    try {
      const retailerIds = retailers.map((r) => r.id);
      await refreshRecommendations(retailerIds);
      window.location.reload();
    } catch {
      // silently fail
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      {/* Salesman header */}
      <motion.div
        variants={fadeInUp}
        initial="hidden"
        animate="visible"
        className="mb-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 p-4"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
            <User className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-foreground">{salesman.name}</p>
            <div className="flex items-center gap-1.5">
              <MapPin className="h-3 w-3 text-zinc-400" />
              <p className="text-xs text-zinc-500">
                {salesman.code} · {salesman.region}
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Visit plan header */}
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-foreground">Visit Plan</h2>
          <p className="text-xs text-zinc-500">
            {retailers.length} retailer{retailers.length !== 1 ? "s" : ""} to
            visit
          </p>
        </div>
        <button
          onClick={handleRefreshAll}
          disabled={refreshing || retailers.length === 0}
          className="flex items-center gap-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 px-3 py-1.5 text-xs text-zinc-600 dark:text-zinc-400 transition-all hover:border-primary/40 hover:text-primary disabled:opacity-40"
        >
          {refreshing ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" />
          )}
          Refresh All
        </button>
      </div>

      {/* Retailer visit cards */}
      {retailers.length === 0 ? (
        <motion.div
          variants={fadeInUp}
          initial="hidden"
          animate="visible"
          className="rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 p-8 text-center"
        >
          <p className="text-sm text-zinc-500">
            No retailers assigned to this salesman.
          </p>
        </motion.div>
      ) : (
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="space-y-3"
        >
          {retailers.map((retailer) => {
            const recs = recommendationsByRetailer[retailer.id] ?? [];
            const insight = insightsByRetailer[retailer.id];
            return (
              <RetailerVisitCard
                key={retailer.id}
                retailer={retailer}
                recommendations={recs}
                insightPreview={insight?.summary?.slice(0, 120)}
              />
            );
          })}
        </motion.div>
      )}
    </div>
  );
}
