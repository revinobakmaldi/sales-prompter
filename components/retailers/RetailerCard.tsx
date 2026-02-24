"use client";

import { motion } from "framer-motion";
import { MapPin, ChevronRight, Star } from "lucide-react";
import Link from "next/link";
import { scaleIn } from "@/lib/animations";
import { tierLabel, tierColor } from "@/lib/utils";
import type { Retailer } from "@/lib/types";

interface RetailerCardProps {
  retailer: Retailer;
  recommendationCount?: number;
  index?: number;
}

export function RetailerCard({
  retailer,
  recommendationCount,
  index = 0,
}: RetailerCardProps) {
  return (
    <motion.div variants={scaleIn} custom={index}>
      <Link
        href={`/retailers/${retailer.id}`}
        className="block rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 p-4 transition-all hover:border-primary/40 hover:shadow-md"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold text-foreground truncate">{retailer.name}</p>
              <span className={`inline-flex items-center rounded border px-1.5 py-0.5 text-xs ${tierColor(retailer.tier)}`}>
                {tierLabel(retailer.tier)}
              </span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              {retailer.code}
            </p>
            <div className="mt-2 flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400">
              <MapPin className="h-3 w-3" />
              {retailer.region}
            </div>
          </div>

          <div className="flex flex-col items-end gap-1.5 shrink-0">
            {recommendationCount !== undefined && recommendationCount > 0 && (
              <div className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                <Star className="h-3 w-3" />
                {recommendationCount} reco
              </div>
            )}
            <ChevronRight className="h-4 w-4 text-zinc-400" />
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
