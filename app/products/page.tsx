"use client";

import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Loader2,
  Package,
  AlertCircle,
  Tag,
  ArrowRight,
  Plus,
  Pencil,
  X,
} from "lucide-react";
import Link from "next/link";
import { Navbar } from "@/components/shared/Navbar";
import { Footer } from "@/components/shared/Footer";
import { AuthGate } from "@/components/shared/AuthGate";
import { fadeInUp, staggerContainer } from "@/lib/animations";
import {
  getProducts,
  getPromotions,
  createProduct,
  updateProduct,
} from "@/lib/api";
import type { Product, Promotion } from "@/lib/types";

interface FormState {
  name: string;
  sku: string;
  brand: string;
  category: string;
  sub_category: string;
  price: string;
}

const EMPTY_FORM: FormState = {
  name: "",
  sku: "",
  brand: "",
  category: "",
  sub_category: "",
  price: "",
};

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [activePromoCount, setActivePromoCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  // Modal state
  const [modal, setModal] = useState<{
    mode: "create" | "edit";
    product?: Product;
  } | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

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

  // Derive top categories for filter tabs
  const categories = useMemo(() => {
    const counts: Record<string, number> = {};
    products.forEach((p) => {
      if (p.category) counts[p.category] = (counts[p.category] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([cat]) => cat);
  }, [products]);

  const filteredProducts = products.filter((p) => {
    const q = search.toLowerCase();
    const matchSearch =
      p.name.toLowerCase().includes(q) ||
      p.sku.toLowerCase().includes(q) ||
      p.brand.toLowerCase().includes(q);
    if (!matchSearch) return false;
    if (categoryFilter !== "all" && p.category !== categoryFilter) return false;
    return true;
  });

  // --- Modal helpers ---
  function openCreate() {
    setForm(EMPTY_FORM);
    setFormError(null);
    setModal({ mode: "create" });
  }

  function openEdit(product: Product) {
    setForm({
      name: product.name,
      sku: product.sku,
      brand: product.brand,
      category: product.category ?? "",
      sub_category: product.sub_category ?? "",
      price: product.price != null ? String(product.price) : "",
    });
    setFormError(null);
    setModal({ mode: "edit", product });
  }

  function closeModal() {
    setModal(null);
    setFormError(null);
  }

  async function handleSave() {
    if (!form.name.trim()) {
      setFormError("Name is required.");
      return;
    }
    if (!form.sku.trim()) {
      setFormError("SKU is required.");
      return;
    }
    if (!form.brand.trim()) {
      setFormError("Brand is required.");
      return;
    }

    setSaving(true);
    setFormError(null);
    try {
      const payload = {
        name: form.name.trim(),
        sku: form.sku.trim(),
        brand: form.brand.trim(),
        category: form.category.trim(),
        sub_category: form.sub_category.trim(),
        price: parseFloat(form.price) || 0,
      };

      if (modal?.mode === "create") {
        const created = await createProduct(payload);
        setProducts((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      } else if (modal?.mode === "edit" && modal.product) {
        const updated = await updateProduct(modal.product.id, payload);
        setProducts((prev) =>
          prev.map((p) => (p.id === updated.id ? updated : p))
        );
      }
      closeModal();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

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
          <div className="flex items-center gap-2">
            <button
              onClick={openCreate}
              className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" />
              Add Product
            </button>
            <Link
              href="/promotions"
              className="flex items-center gap-1.5 rounded-lg border border-primary/30 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/10 transition-colors"
            >
              <Tag className="h-4 w-4" />
              Manage Promotions
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </motion.div>

        {/* Search + Category Filter */}
        <motion.div
          variants={fadeInUp}
          initial="hidden"
          animate="visible"
          className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center"
        >
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, SKU or brand..."
              className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 py-2.5 pl-9 pr-4 text-sm text-foreground placeholder:text-zinc-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          {categories.length > 0 && (
            <div className="flex gap-1 overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-100/50 dark:bg-zinc-900/50 p-1">
              {["all", ...categories].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                    categoryFilter === cat
                      ? "bg-white dark:bg-zinc-800 text-foreground shadow-sm"
                      : "text-zinc-500 hover:text-foreground"
                  }`}
                >
                  {cat === "all" ? "All" : cat}
                </button>
              ))}
            </div>
          )}
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
              {search || categoryFilter !== "all"
                ? "No products match your filters."
                : "No products yet. Click \"Add Product\" to create one."}
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
                  <th className="px-4 py-3 text-left font-medium text-zinc-600 dark:text-zinc-400">
                    Product
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-zinc-600 dark:text-zinc-400">
                    SKU
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-zinc-600 dark:text-zinc-400">
                    Brand
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-zinc-600 dark:text-zinc-400">
                    Category
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-zinc-600 dark:text-zinc-400">
                    Price
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-zinc-600 dark:text-zinc-400">
                    Actions
                  </th>
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
                      {product.sub_category
                        ? ` / ${product.sub_category}`
                        : ""}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs text-zinc-500">
                      {product.price != null
                        ? product.price.toLocaleString()
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => openEdit(product)}
                        className="rounded-lg border border-zinc-200 dark:border-zinc-700 p-1.5 text-zinc-500 hover:border-primary/40 hover:text-primary transition-colors"
                        title="Edit"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </motion.div>
        )}
      </main>
      <Footer />

      {/* Create / Edit Modal */}
      <AnimatePresence>
        {modal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={(e) => {
              if (e.target === e.currentTarget) closeModal();
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-md rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xl"
            >
              {/* Modal header */}
              <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 px-5 py-4">
                <h2 className="font-semibold text-foreground">
                  {modal.mode === "create" ? "Add Product" : "Edit Product"}
                </h2>
                <button
                  onClick={closeModal}
                  className="rounded-lg p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Modal body */}
              <div className="px-5 py-4 space-y-4">
                {/* Name */}
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                    Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, name: e.target.value }))
                    }
                    placeholder="Product name"
                    className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 py-2.5 px-3 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                {/* SKU + Brand */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                      SKU <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={form.sku}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, sku: e.target.value }))
                      }
                      placeholder="e.g. SKU-001"
                      className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 py-2.5 px-3 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                      Brand <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={form.brand}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, brand: e.target.value }))
                      }
                      placeholder="Brand name"
                      className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 py-2.5 px-3 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>

                {/* Category + Sub-category */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                      Category
                    </label>
                    <input
                      type="text"
                      value={form.category}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, category: e.target.value }))
                      }
                      placeholder="e.g. Beverages"
                      className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 py-2.5 px-3 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                      Sub-category
                    </label>
                    <input
                      type="text"
                      value={form.sub_category}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          sub_category: e.target.value,
                        }))
                      }
                      placeholder="e.g. Juice"
                      className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 py-2.5 px-3 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>

                {/* Price */}
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                    Price
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={form.price}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, price: e.target.value }))
                    }
                    placeholder="0"
                    className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 py-2.5 px-3 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                {/* Form error */}
                {formError && (
                  <p className="flex items-center gap-1.5 text-xs text-red-500">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    {formError}
                  </p>
                )}
              </div>

              {/* Modal footer */}
              <div className="flex justify-end gap-2 border-t border-zinc-100 dark:border-zinc-800 px-5 py-4">
                <button
                  onClick={closeModal}
                  className="rounded-lg border border-zinc-200 dark:border-zinc-700 px-4 py-2 text-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-60 transition-colors"
                >
                  {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {modal.mode === "create" ? "Create" : "Save changes"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AuthGate>
  );
}
