"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { User, MapPin, RefreshCw, Loader2, Search, X } from "lucide-react";
import { staggerContainer, fadeInUp } from "@/lib/animations";
import { RetailerVisitCard } from "@/components/salesman/RetailerVisitCard";
import type { Salesman, Retailer, Recommendation } from "@/lib/types";
import { refreshRecommendations } from "@/lib/api";

type TierFilter = "all" | "small" | "medium" | "large";

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
  const [search, setSearch] = useState("");
  const [tierFilter, setTierFilter] = useState<TierFilter>("all");

  const filteredRetailers = retailers.filter((r) => {
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      r.name.toLowerCase().includes(q) ||
      r.code.toLowerCase().includes(q) ||
      r.region.toLowerCase().includes(q);
    const matchesTier = tierFilter === "all" || r.tier === tierFilter;
    return matchesSearch && matchesTier;
  });

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

  const tierOptions: { label: string; value: TierFilter }[] = [
    { label: "All", value: "all" },
    { label: "Small", value: "small" },
    { label: "Medium", value: "medium" },
    { label: "Large", value: "large" },
  ];

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
            {search || tierFilter !== "all"
              ? `${filteredRetailers.length} of ${retailers.length} retailer${retailers.length !== 1 ? "s" : ""}`
              : `${retailers.length} retailer${retailers.length !== 1 ? "s" : ""} to visit`}
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

      {/* Search + tier filters */}
      {retailers.length > 0 && (
        <div className="mb-3 space-y-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, code or region…"
              className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900/50 py-2 pl-8 pr-8 text-sm text-foreground placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <div className="flex gap-1.5">
            {tierOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setTierFilter(opt.value)}
                className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition-all ${
                  tierFilter === opt.value
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:border-primary/40 hover:text-primary"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}

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
      ) : filteredRetailers.length === 0 ? (
        <motion.div
          variants={fadeInUp}
          initial="hidden"
          animate="visible"
          className="rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 p-8 text-center"
        >
          <p className="text-sm text-zinc-500">No retailers match your search.</p>
          <button
            onClick={() => { setSearch(""); setTierFilter("all"); }}
            className="mt-2 text-xs text-primary hover:underline"
          >
            Clear filters
          </button>
        </motion.div>
      ) : (
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="space-y-3"
        >
          {filteredRetailers.map((retailer) => {
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
