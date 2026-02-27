"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Sparkles, RefreshCw, Loader2, AlertTriangle } from "lucide-react";
import { fadeInUp } from "@/lib/animations";
import { getInsight, generateInsight } from "@/lib/api";
import type { Insight } from "@/lib/types";

interface InsightSummaryProps {
  retailerId: string;
}

export function InsightSummary({ retailerId }: InsightSummaryProps) {
  const [insight, setInsight] = useState<Insight | null>(null);
  const [fresh, setFresh] = useState(true);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchInsight = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getInsight(retailerId);
      if (res.insight) {
        setInsight(res.insight);
        setFresh(res.fresh);
        setLoading(false);
      } else {
        // No cached insight — auto-generate
        setLoading(false);
        await handleGenerate();
      }
    } catch {
      setError("Failed to load insight");
      setLoading(false);
    }
  }, [retailerId]);

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    try {
      const res = await generateInsight(retailerId);
      setInsight(res.insight);
      setFresh(res.fresh);
    } catch {
      setError("Failed to generate insight");
    } finally {
      setGenerating(false);
    }
  };

  useEffect(() => {
    fetchInsight();
  }, [fetchInsight]);

  if (loading) {
    return (
      <motion.div
        variants={fadeInUp}
        initial="hidden"
        animate="visible"
        className="mb-4 rounded-xl border border-primary/20 bg-primary/5 p-4"
      >
        <div className="flex items-center gap-2 text-sm text-zinc-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading visit briefing…
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      variants={fadeInUp}
      initial="hidden"
      animate="visible"
      className="mb-4 rounded-xl border border-primary/20 bg-primary/5 p-4"
    >
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-xs font-semibold text-primary">
            Visit Briefing
          </span>
          {!fresh && !generating && (
            <span className="ml-1 flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-400">
              <AlertTriangle className="h-3 w-3" />
              Stale
            </span>
          )}
        </div>
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-primary/70 transition-colors hover:bg-primary/10 hover:text-primary disabled:opacity-40"
        >
          {generating ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <RefreshCw className="h-3 w-3" />
          )}
          {generating ? "Generating…" : "Refresh"}
        </button>
      </div>

      {error && !insight && (
        <p className="text-sm text-red-500">{error}</p>
      )}

      {generating && !insight && (
        <div className="flex items-center gap-2 text-sm text-zinc-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Generating briefing…
        </div>
      )}

      {insight && (
        <ul className="list-disc list-outside ml-4 space-y-1 text-sm leading-relaxed text-foreground/80">
          {insight.summary
            .split(/\n/)
            .map((line) => line.replace(/^[\s]*[-•●*]\s*/, "").replace(/^\d+[.)]\s*/, "").trim())
            .filter(Boolean)
            .map((line, i) => (
              <li key={i}>{line}</li>
            ))}
        </ul>
      )}
    </motion.div>
  );
}
