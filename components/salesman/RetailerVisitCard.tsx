"use client";

import { motion } from "framer-motion";
import { MapPin, Package, Sparkles } from "lucide-react";
import Link from "next/link";
import { fadeInUp } from "@/lib/animations";
import { ScoreBadge } from "@/components/recommendations/ScoreBadge";
import type { Retailer, Recommendation } from "@/lib/types";

const TIER_COLORS: Record<string, string> = {
  large: "bg-primary/10 text-primary border-primary/20",
  medium: "bg-secondary/10 text-secondary border-secondary/20",
  small: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700",
};

interface RetailerVisitCardProps {
  retailer: Retailer;
  recommendations: Recommendation[];
  insightPreview?: string;
}

export function RetailerVisitCard({
  retailer,
  recommendations,
  insightPreview,
}: RetailerVisitCardProps) {
  const top3 = recommendations.slice(0, 3);
  const tierColor = TIER_COLORS[retailer.tier] ?? TIER_COLORS.small;

  return (
    <motion.div variants={fadeInUp}>
      <Link
        href={`/retailers/${retailer.id}`}
        className="block rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 p-4 transition-all hover:border-primary/40 hover:shadow-md active:scale-[0.98]"
      >
        {/* Header row */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="min-w-0">
            <p className="font-semibold text-foreground truncate">
              {retailer.name}
            </p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <MapPin className="h-3 w-3 text-zinc-400 shrink-0" />
              <span className="text-xs text-zinc-500 truncate">
                {retailer.code} · {retailer.region}
              </span>
            </div>
          </div>
          <span
            className={`shrink-0 rounded-md border px-2 py-0.5 text-xs font-medium capitalize ${tierColor}`}
          >
            {retailer.tier}
          </span>
        </div>

        {/* Top 3 recommendations */}
        {top3.length > 0 ? (
          <div className="mb-3">
            <div className="flex items-center gap-1 mb-1.5">
              <Package className="h-3 w-3 text-zinc-400" />
              <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-400">
                Top Products ({recommendations.length} total)
              </span>
            </div>
            <div className="space-y-1">
              {top3.map((rec) => (
                <div
                  key={rec.id}
                  className="flex items-center justify-between gap-2"
                >
                  <span className="text-sm text-foreground/80 truncate">
                    {rec.product?.name ?? "Unknown"}
                  </span>
                  <ScoreBadge score={rec.score} size="sm" />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="mb-3 rounded-lg border border-dashed border-zinc-200 dark:border-zinc-700 px-3 py-2">
            <p className="text-xs text-zinc-400">No recommendations yet</p>
          </div>
        )}

        {/* Insight preview */}
        {insightPreview && (
          <div className="rounded-lg bg-primary/5 border border-primary/10 px-3 py-2">
            <div className="flex items-center gap-1 mb-0.5">
              <Sparkles className="h-3 w-3 text-primary" />
              <span className="text-[10px] font-medium text-primary">
                AI Briefing
              </span>
            </div>
            <p className="text-xs text-foreground/60 line-clamp-2">
              {insightPreview}
            </p>
          </div>
        )}
      </Link>
    </motion.div>
  );
}
