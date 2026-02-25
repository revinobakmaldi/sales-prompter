"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Search, Loader2, User, AlertCircle, MapPin, Users } from "lucide-react";
import Link from "next/link";
import { Navbar } from "@/components/shared/Navbar";
import { Footer } from "@/components/shared/Footer";
import { AuthGate } from "@/components/shared/AuthGate";
import { fadeInUp, staggerContainer } from "@/lib/animations";
import { getSalesmen, getRetailers } from "@/lib/api";
import type { Salesman, Retailer } from "@/lib/types";

export default function SalesmanSelectorPage() {
  const [salesmen, setSalesmen] = useState<Salesman[]>([]);
  const [retailerCounts, setRetailerCounts] = useState<Record<string, number>>(
    {}
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const [salesmenData, retailersData] = await Promise.all([
          getSalesmen(),
          getRetailers(),
        ]);
        setSalesmen(salesmenData);

        // Count retailers per salesman
        const counts: Record<string, number> = {};
        retailersData.forEach((r: Retailer) => {
          counts[r.salesman_id] = (counts[r.salesman_id] || 0) + 1;
        });
        setRetailerCounts(counts);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filtered = salesmen.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.code.toLowerCase().includes(search.toLowerCase()) ||
      s.region.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AuthGate>
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {/* Header */}
        <motion.div
          variants={fadeInUp}
          initial="hidden"
          animate="visible"
          className="mb-6"
        >
          <h1 className="text-3xl font-bold">
            <span className="bg-gradient-to-r from-zinc-900 via-zinc-700 to-zinc-500 dark:from-zinc-100 dark:via-zinc-300 dark:to-zinc-500 bg-clip-text text-transparent">
              Salesman
            </span>
          </h1>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            Select your name to view your visit plan.
          </p>
        </motion.div>

        {/* Search */}
        <motion.div
          variants={fadeInUp}
          initial="hidden"
          animate="visible"
          className="mb-6"
        >
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, code or region..."
              className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 py-2.5 pl-9 pr-4 text-sm text-foreground placeholder:text-zinc-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </motion.div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="flex items-center gap-3 rounded-xl border border-red-200 dark:border-red-800/30 bg-red-500/10 px-5 py-4 text-sm text-red-400">
            <AlertCircle className="h-5 w-5 shrink-0" />
            {error}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-20 text-zinc-500">
            <Users className="h-10 w-10 opacity-30" />
            <p className="text-sm">
              {search
                ? "No salesmen match your search."
                : "No salesmen found."}
            </p>
          </div>
        ) : (
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
          >
            {filtered.map((salesman) => (
              <motion.div key={salesman.id} variants={fadeInUp}>
                <Link
                  href={`/salesman/${salesman.id}`}
                  className="block rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 p-4 transition-all hover:border-primary/40 hover:shadow-md active:scale-[0.98]"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 shrink-0">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-foreground truncate">
                        {salesman.name}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <MapPin className="h-3 w-3 text-zinc-400 shrink-0" />
                        <span className="text-xs text-zinc-500 truncate">
                          {salesman.code} · {salesman.region}
                        </span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-lg font-semibold text-foreground">
                        {retailerCounts[salesman.id] ?? 0}
                      </p>
                      <p className="text-[10px] text-zinc-400">retailers</p>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        )}
      </main>
      <Footer />
    </AuthGate>
  );
}
