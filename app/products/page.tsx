"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Search,
  Loader2,
  Package,
  AlertCircle,
  Tag,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import { Navbar } from "@/components/shared/Navbar";
import { Footer } from "@/components/shared/Footer";
import { AuthGate } from "@/components/shared/AuthGate";
import { fadeInUp, staggerContainer } from "@/lib/animations";
import { getProducts, getPromotions } from "@/lib/api";
import type { Product, Promotion } from "@/lib/types";

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [activePromoCount, setActivePromoCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    Promise.all([getProducts(), getPromotions()])
      .then(([prods, promos]: [Product[], Promotion[]]) => {
        setProducts(prods);
        setActivePromoCount(promos.filter((p) => p.is_active).length);
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Failed to load")
      )
      .finally(() => setLoading(false));
  }, []);

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase()) ||
      p.brand.toLowerCase().includes(search.toLowerCase())
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
          className="mb-6 flex flex-wrap items-start justify-between gap-4"
        >
          <div>
            <h1 className="text-3xl font-bold">
              <span className="bg-gradient-to-r from-zinc-900 via-zinc-700 to-zinc-500 dark:from-zinc-100 dark:via-zinc-300 dark:to-zinc-500 bg-clip-text text-transparent">
                Products
              </span>
            </h1>
            <p className="mt-1 text-zinc-500 dark:text-zinc-400 text-sm">
              {products.length} products · {activePromoCount} active promos
            </p>
          </div>
          <Link
            href="/promotions"
            className="flex items-center gap-1.5 rounded-lg border border-primary/30 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/10 transition-colors"
          >
            <Tag className="h-4 w-4" />
            Manage Promotions
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </motion.div>

        {/* Search */}
        <motion.div
          variants={fadeInUp}
          initial="hidden"
          animate="visible"
          className="mb-6"
        >
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, SKU or brand..."
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
        ) : filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-20 text-zinc-500">
            <Package className="h-10 w-10 opacity-30" />
            <p className="text-sm">
              {search
                ? "No products match your search."
                : "No products yet. Upload transaction data to add products."}
            </p>
          </div>
        ) : (
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800"
          >
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
                  <th className="px-4 py-3 text-left font-medium text-zinc-600 dark:text-zinc-400">Product</th>
                  <th className="px-4 py-3 text-left font-medium text-zinc-600 dark:text-zinc-400">SKU</th>
                  <th className="px-4 py-3 text-left font-medium text-zinc-600 dark:text-zinc-400">Brand</th>
                  <th className="px-4 py-3 text-left font-medium text-zinc-600 dark:text-zinc-400">Category</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product, i) => (
                  <motion.tr
                    key={product.id}
                    variants={fadeInUp}
                    custom={i}
                    className="border-b border-zinc-100 dark:border-zinc-800/50 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/30 last:border-b-0"
                  >
                    <td className="px-4 py-3 font-medium text-foreground">
                      {product.name}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-zinc-500">
                      {product.sku}
                    </td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                      {product.brand}
                    </td>
                    <td className="px-4 py-3 text-zinc-500 text-xs">
                      {product.category}
                      {product.sub_category ? ` / ${product.sub_category}` : ""}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </motion.div>
        )}
      </main>
      <Footer />
    </AuthGate>
  );
}
