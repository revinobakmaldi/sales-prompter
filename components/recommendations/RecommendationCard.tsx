"use client";

import { motion } from "framer-motion";
import { scaleIn } from "@/lib/animations";
import type { Recommendation } from "@/lib/types";
import { ScoreBadge } from "./ScoreBadge";
import { PromoTag } from "./PromoTag";
import { InsightPanel } from "./InsightPanel";

interface RecommendationCardProps {
  recommendation: Recommendation;
  index?: number;
}

const RANK_COLORS: Record<number, string> = {
  1: "bg-amber-400 text-amber-900",
  2: "bg-zinc-300 dark:bg-zinc-600 text-zinc-900 dark:text-zinc-100",
  3: "bg-amber-700/30 text-amber-800 dark:text-amber-400",
};

export function RecommendationCard({
  recommendation,
  index = 0,
}: RecommendationCardProps) {
  const { rank, score, reason_tags, phase, product, promotion } = recommendation;
  const rankColor = RANK_COLORS[rank] ?? "bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300";

  return (
    <motion.div
      variants={scaleIn}
      custom={index}
      className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 p-4 transition-shadow hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          {/* Rank badge */}
          <span
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${rankColor}`}
          >
            #{rank}
          </span>

          <div className="min-w-0">
            <p className="font-semibold text-foreground truncate">
              {product?.name ?? "Unknown product"}
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {product?.sku} · {product?.brand}
            </p>
            <InsightPanel reasonTags={reason_tags} phase={phase} />
          </div>
        </div>

        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <ScoreBadge score={score} />
          {promotion && <PromoTag promotion={promotion} compact />}
        </div>
      </div>
    </motion.div>
  );
}
