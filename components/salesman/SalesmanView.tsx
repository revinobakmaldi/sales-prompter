"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { User, MapPin, RefreshCw, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { staggerContainer, fadeInUp } from "@/lib/animations";
import { RecommendationCard } from "@/components/recommendations/RecommendationCard";
import type { Salesman, Retailer, Recommendation } from "@/lib/types";
import { refreshRecommendations } from "@/lib/api";

interface SalesmanViewProps {
  salesman: Salesman;
  retailers: Retailer[];
  recommendationsByRetailer: Record<string, Recommendation[]>;
}

export function SalesmanView({
  salesman,
  retailers,
  recommendationsByRetailer,
}: SalesmanViewProps) {
  const [selectedRetailerId, setSelectedRetailerId] = useState<string | null>(
    retailers[0]?.id ?? null
  );
  const [refreshing, setRefreshing] = useState(false);
  const [showRetailerList, setShowRetailerList] = useState(false);

  const selectedRetailer = retailers.find((r) => r.id === selectedRetailerId);
  const recommendations = selectedRetailerId
    ? (recommendationsByRetailer[selectedRetailerId] ?? [])
    : [];

  const handleRefresh = async () => {
    if (!selectedRetailerId) return;
    setRefreshing(true);
    try {
      await refreshRecommendations([selectedRetailerId]);
      window.location.reload();
    } catch {
      // silently fail
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 py-6">
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
          <div>
            <p className="font-semibold text-foreground">{salesman.name}</p>
            <p className="text-xs text-zinc-500">
              {salesman.code} · {salesman.region}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Retailer selector */}
      <motion.div
        variants={fadeInUp}
        initial="hidden"
        animate="visible"
        className="mb-4"
      >
        <button
          onClick={() => setShowRetailerList(!showRetailerList)}
          className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 p-4 text-left transition-all hover:border-primary/40"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <MapPin className="h-4 w-4 text-primary shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-zinc-500">Visiting</p>
                <p className="font-semibold text-foreground truncate">
                  {selectedRetailer?.name ?? "Select a retailer"}
                </p>
              </div>
            </div>
            {showRetailerList ? (
              <ChevronUp className="h-4 w-4 text-zinc-400 shrink-0" />
            ) : (
              <ChevronDown className="h-4 w-4 text-zinc-400 shrink-0" />
            )}
          </div>
        </button>

        {showRetailerList && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-1 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-lg overflow-hidden"
          >
            {retailers.map((retailer) => (
              <button
                key={retailer.id}
                onClick={() => {
                  setSelectedRetailerId(retailer.id);
                  setShowRetailerList(false);
                }}
                className={`w-full px-4 py-3 text-left transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800 border-b border-zinc-100 dark:border-zinc-800 last:border-b-0 ${
                  selectedRetailerId === retailer.id
                    ? "text-primary bg-primary/5"
                    : "text-foreground"
                }`}
              >
                <p className="font-medium">{retailer.name}</p>
                <p className="text-xs text-zinc-500">
                  {retailer.code} · {retailer.region}
                </p>
              </button>
            ))}
          </motion.div>
        )}
      </motion.div>

      {/* Priority products header */}
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-foreground">
            Today&apos;s Priority Products
          </h2>
          <p className="text-xs text-zinc-500">
            {recommendations.length} products to push
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing || !selectedRetailerId}
          className="flex items-center gap-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 px-3 py-1.5 text-xs text-zinc-600 dark:text-zinc-400 transition-all hover:border-primary/40 hover:text-primary disabled:opacity-40"
        >
          {refreshing ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" />
          )}
          Refresh
        </button>
      </div>

      {/* Recommendation cards */}
      {recommendations.length === 0 ? (
        <motion.div
          variants={fadeInUp}
          initial="hidden"
          animate="visible"
          className="rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 p-8 text-center"
        >
          <p className="text-sm text-zinc-500">
            No recommendations yet for this retailer.
          </p>
          <p className="mt-1 text-xs text-zinc-400">
            Upload transaction data or refresh to generate.
          </p>
        </motion.div>
      ) : (
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="space-y-3"
        >
          {recommendations.map((rec, i) => (
            <RecommendationCard key={rec.id} recommendation={rec} index={i} />
          ))}
        </motion.div>
      )}
    </div>
  );
}
