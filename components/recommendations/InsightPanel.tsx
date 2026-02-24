"use client";

import { Lightbulb, Clock, Tag, Sparkles, TrendingDown, Users } from "lucide-react";
import type { ReasonTag } from "@/lib/types";
import { REASON_LABELS } from "@/lib/types";

const TAG_ICONS: Record<ReasonTag, React.ElementType> = {
  recency_score: Clock,
  promo_boost: Tag,
  new_product_bonus: Sparkles,
  decline_flag: TrendingDown,
  cf_signal: Users,
};

const TAG_COLORS: Record<ReasonTag, string> = {
  recency_score: "text-amber-500",
  promo_boost: "text-primary",
  new_product_bonus: "text-violet-500",
  decline_flag: "text-red-400",
  cf_signal: "text-secondary",
};

interface InsightPanelProps {
  reasonTags: ReasonTag[];
  phase: "phase1" | "phase2";
}

export function InsightPanel({ reasonTags, phase }: InsightPanelProps) {
  if (reasonTags.length === 0) return null;

  return (
    <div className="mt-2 space-y-1">
      {reasonTags.map((tag) => {
        const Icon = TAG_ICONS[tag] ?? Lightbulb;
        const color = TAG_COLORS[tag] ?? "text-zinc-500";
        return (
          <div key={tag} className={`flex items-center gap-1.5 text-xs ${color}`}>
            <Icon className="h-3 w-3 shrink-0" />
            <span>{REASON_LABELS[tag]}</span>
          </div>
        );
      })}
      {phase === "phase2" && (
        <div className="mt-1 flex items-center gap-1 text-[10px] text-zinc-400">
          <Sparkles className="h-2.5 w-2.5" />
          ML-enhanced
        </div>
      )}
    </div>
  );
}
