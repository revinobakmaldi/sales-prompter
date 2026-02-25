"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Loader2, AlertCircle } from "lucide-react";
import { Navbar } from "@/components/shared/Navbar";
import { Footer } from "@/components/shared/Footer";
import { AuthGate } from "@/components/shared/AuthGate";
import { SalesmanView } from "@/components/salesman/SalesmanView";
import {
  getSalesman,
  getRetailers,
  getRecommendations,
  getInsightsBatch,
} from "@/lib/api";
import type { Salesman, Retailer, Recommendation } from "@/lib/types";

export default function SalesmanPage() {
  const { id } = useParams<{ id: string }>();
  const [salesman, setSalesman] = useState<Salesman | null>(null);
  const [retailers, setRetailers] = useState<Retailer[]>([]);
  const [recommendationsByRetailer, setRecommendationsByRetailer] = useState<
    Record<string, Recommendation[]>
  >({});
  const [insightsByRetailer, setInsightsByRetailer] = useState<
    Record<string, { summary: string; fresh: boolean }>
  >({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    async function load() {
      try {
        const [salesmanData, retailersData] = await Promise.all([
          getSalesman(id),
          getRetailers(id),
        ]);
        setSalesman(salesmanData);
        setRetailers(retailersData);

        // Load recommendations + insights in parallel
        const retailerIds = retailersData.map((r) => r.id);

        const [recoResults, insightsData] = await Promise.all([
          Promise.all(
            retailersData.map(async (r) => {
              try {
                const recos = await getRecommendations(r.id);
                return { id: r.id, recos };
              } catch {
                return { id: r.id, recos: [] };
              }
            })
          ),
          retailerIds.length > 0
            ? getInsightsBatch(retailerIds).catch(() => ({}))
            : Promise.resolve({}),
        ]);

        const recoMap: Record<string, Recommendation[]> = {};
        recoResults.forEach(({ id: rid, recos }) => {
          recoMap[rid] = recos;
        });
        setRecommendationsByRetailer(recoMap);
        setInsightsByRetailer(insightsData as Record<string, { summary: string; fresh: boolean }>);
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
      <main className="pb-6">
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : error || !salesman ? (
          <div className="mx-auto max-w-md px-4 py-8">
            <div className="flex items-center gap-3 rounded-xl border border-red-200 dark:border-red-800/30 bg-red-500/10 px-5 py-4 text-sm text-red-400">
              <AlertCircle className="h-5 w-5 shrink-0" />
              {error ?? "Salesman not found."}
            </div>
          </div>
        ) : (
          <SalesmanView
            salesman={salesman}
            retailers={retailers}
            recommendationsByRetailer={recommendationsByRetailer}
            insightsByRetailer={insightsByRetailer}
          />
        )}
      </main>
      <Footer />
    </AuthGate>
  );
}
