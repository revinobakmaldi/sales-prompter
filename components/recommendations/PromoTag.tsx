"use client";

import { Tag } from "lucide-react";
import type { Promotion } from "@/lib/types";

interface PromoTagProps {
  promotion: Promotion;
  compact?: boolean;
}

const PROMO_STYLES: Record<string, string> = {
  discount: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  npl: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20",
  bundle: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  priority: "bg-primary/10 text-primary border-primary/20",
};

export function PromoTag({ promotion, compact = false }: PromoTagProps) {
  const style = PROMO_STYLES[promotion.promo_type] ?? PROMO_STYLES.priority;

  const label =
    promotion.promo_type === "discount"
      ? `${promotion.discount_pct}% disc`
      : promotion.promo_type === "npl"
        ? "NPL"
        : promotion.promo_type === "bundle"
          ? "Bundle"
          : "Priority";

  if (compact) {
    return (
      <span className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-xs ${style}`}>
        <Tag className="h-2.5 w-2.5" />
        {label}
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-sm ${style}`}>
      <Tag className="h-3.5 w-3.5" />
      {label}
    </span>
  );
}
