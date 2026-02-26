"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Loader2,
  Tag,
  Plus,
  Clock,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Pencil,
  Trash2,
  X,
  ChevronDown,
} from "lucide-react";
import { Navbar } from "@/components/shared/Navbar";
import { Footer } from "@/components/shared/Footer";
import { AuthGate } from "@/components/shared/AuthGate";
import { PromoTag } from "@/components/recommendations/PromoTag";
import { fadeInUp, staggerContainer } from "@/lib/animations";
import {
  getProducts,
  getPromotions,
  createPromotion,
  updatePromotion,
  deletePromotion,
} from "@/lib/api";
import type { Product, Promotion } from "@/lib/types";

type Filter = "all" | "active" | "inactive" | "expiring";

interface FormState {
  product_id: string;
  promo_type: Promotion["promo_type"];
  discount_pct: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
}

const EMPTY_FORM: FormState = {
  product_id: "",
  promo_type: "discount",
  discount_pct: "",
  start_date: "",
  end_date: "",
  is_active: true,
};

function daysUntilExpiry(endDate: string | null | undefined): number | null {
  if (!endDate) return null;
  return Math.ceil((new Date(endDate).getTime() - Date.now()) / 86_400_000);
}

export default function PromotionsPage() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  // Modal state
  const [modal, setModal] = useState<{ mode: "create" | "edit"; promo?: Promotion } | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Delete confirmation
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    Promise.all([getProducts(), getPromotions()])
      .then(([prods, promos]) => {
        setProducts(prods);
        setPromotions(promos);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  // --- Derived ---
  const expiringPromos = promotions.filter((p) => {
    if (!p.is_active || !p.end_date) return false;
    const d = daysUntilExpiry(p.end_date);
    return d !== null && d >= 0 && d <= 7;
  });
  const expiredActivePromos = promotions.filter((p) => {
    if (!p.is_active || !p.end_date) return false;
    const d = daysUntilExpiry(p.end_date);
    return d !== null && d < 0;
  });

  const filtered = promotions.filter((p) => {
    const q = search.toLowerCase();
    const matchSearch =
      (p.product?.name ?? "").toLowerCase().includes(q) ||
      (p.product?.sku ?? "").toLowerCase().includes(q);
    if (!matchSearch) return false;
    if (filter === "active") return p.is_active;
    if (filter === "inactive") return !p.is_active;
    if (filter === "expiring") {
      const d = daysUntilExpiry(p.end_date);
      return p.is_active && d !== null && d <= 7;
    }
    return true;
  });

  // --- Modal helpers ---
  function openCreate() {
    setForm(EMPTY_FORM);
    setFormError(null);
    setModal({ mode: "create" });
  }

  function openEdit(promo: Promotion) {
    setForm({
      product_id: promo.product_id,
      promo_type: promo.promo_type,
      discount_pct: promo.discount_pct != null ? String(promo.discount_pct) : "",
      start_date: promo.start_date ?? "",
      end_date: promo.end_date ?? "",
      is_active: promo.is_active,
    });
    setFormError(null);
    setModal({ mode: "edit", promo });
  }

  function closeModal() {
    setModal(null);
    setFormError(null);
  }

  async function handleSave() {
    if (!form.product_id) { setFormError("Please select a product."); return; }
    if (!form.start_date || !form.end_date) { setFormError("Start and end dates are required."); return; }
    if (form.start_date > form.end_date) { setFormError("End date must be after start date."); return; }

    setSaving(true);
    setFormError(null);
    try {
      const payload = {
        product_id: form.product_id,
        promo_type: form.promo_type,
        discount_pct: form.promo_type === "discount" ? parseFloat(form.discount_pct) || 0 : 0,
        start_date: form.start_date,
        end_date: form.end_date,
        is_active: form.is_active,
      };

      if (modal?.mode === "create") {
        const created = await createPromotion(payload);
        const product = products.find((p) => p.id === created.product_id);
        setPromotions((prev) => [{ ...created, product }, ...prev]);
      } else if (modal?.mode === "edit" && modal.promo) {
        const updated = await updatePromotion(modal.promo.id, payload);
        const product = products.find((p) => p.id === updated.product_id);
        setPromotions((prev) =>
          prev.map((p) => (p.id === updated.id ? { ...updated, product } : p))
        );
      }
      closeModal();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(promo: Promotion) {
    try {
      const updated = await updatePromotion(promo.id, { is_active: !promo.is_active });
      setPromotions((prev) => prev.map((p) => (p.id === updated.id ? { ...updated, product: p.product } : p)));
    } catch { /* silent */ }
  }

  async function handleDelete() {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await deletePromotion(deleteId);
      setPromotions((prev) => prev.filter((p) => p.id !== deleteId));
      setDeleteId(null);
    } catch { /* silent */ } finally {
      setDeleting(false);
    }
  }

  const filterCounts: Record<Filter, number> = {
    all: promotions.length,
    active: promotions.filter((p) => p.is_active).length,
    inactive: promotions.filter((p) => !p.is_active).length,
    expiring: promotions.filter((p) => {
      const d = daysUntilExpiry(p.end_date);
      return p.is_active && d !== null && d <= 7;
    }).length,
  };

  return (
    <AuthGate>
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">

        {/* Header */}
        <motion.div variants={fadeInUp} initial="hidden" animate="visible" className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">
              <span className="bg-gradient-to-r from-zinc-900 via-zinc-700 to-zinc-500 dark:from-zinc-100 dark:via-zinc-300 dark:to-zinc-500 bg-clip-text text-transparent">
                Promotions
              </span>
            </h1>
            <p className="mt-1 text-zinc-500 dark:text-zinc-400 text-sm">
              {filterCounts.active} active · {filterCounts.expiring > 0 ? `${filterCounts.expiring} expiring soon · ` : ""}{filterCounts.all} total
            </p>
          </div>
          <button
            onClick={openCreate}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            New Promotion
          </button>
        </motion.div>

        {/* Search + Filter */}
        <motion.div variants={fadeInUp} initial="hidden" animate="visible" className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by product name or SKU..."
              className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 py-2.5 pl-9 pr-4 text-sm text-foreground placeholder:text-zinc-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div className="flex gap-1 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-100/50 dark:bg-zinc-900/50 p-1">
            {(["all", "active", "inactive", "expiring"] as Filter[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium capitalize transition-all ${
                  filter === f
                    ? "bg-white dark:bg-zinc-800 text-foreground shadow-sm"
                    : "text-zinc-500 hover:text-foreground"
                }`}
              >
                {f}
                {filterCounts[f] > 0 && (
                  <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] ${
                    filter === f ? "bg-primary/10 text-primary" : "bg-zinc-200 dark:bg-zinc-700 text-zinc-500"
                  }`}>
                    {filterCounts[f]}
                  </span>
                )}
              </button>
            ))}
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
        ) : (
          <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-3">

            {/* Expiry banners */}
            {expiredActivePromos.length > 0 && (
              <motion.div variants={fadeInUp} className="flex items-start gap-3 rounded-xl border border-red-200 dark:border-red-800/40 bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-400">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <p className="font-medium">{expiredActivePromos.length} active promo{expiredActivePromos.length > 1 ? "s have" : " has"} already expired</p>
                  <p className="mt-0.5 text-xs text-red-500 dark:text-red-500/80">
                    {expiredActivePromos.map((p) => p.product?.name ?? "Unknown").join(", ")} — consider deactivating.
                  </p>
                </div>
              </motion.div>
            )}
            {expiringPromos.length > 0 && (
              <motion.div variants={fadeInUp} className="flex items-start gap-3 rounded-xl border border-amber-200 dark:border-amber-800/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
                <Clock className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <p className="font-medium">{expiringPromos.length} promo{expiringPromos.length > 1 ? "s expire" : " expires"} within 7 days</p>
                  <p className="mt-0.5 text-xs text-amber-600 dark:text-amber-500/80">
                    {expiringPromos.map((p) => {
                      const d = daysUntilExpiry(p.end_date);
                      const label = d === 0 ? "today" : d === 1 ? "tomorrow" : `in ${d} days`;
                      return `${p.product?.name ?? "Unknown"} (${label})`;
                    }).join(", ")}
                  </p>
                </div>
              </motion.div>
            )}

            {/* Promo list */}
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-20 text-zinc-500">
                <Tag className="h-10 w-10 opacity-30" />
                <p className="text-sm">{search || filter !== "all" ? "No promotions match your filters." : "No promotions yet. Create one to get started."}</p>
              </div>
            ) : (
              filtered.map((promo, i) => {
                const days = daysUntilExpiry(promo.end_date);
                return (
                  <motion.div
                    key={promo.id}
                    variants={fadeInUp}
                    custom={i}
                    className="flex items-center justify-between rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 px-4 py-3 gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-foreground">{promo.product?.name ?? "Unknown product"}</p>
                        <PromoTag promotion={promo} compact />
                        {!promo.is_active && (
                          <span className="rounded border border-zinc-300 dark:border-zinc-600 px-1.5 py-0.5 text-xs text-zinc-400">Inactive</span>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-zinc-500 flex flex-wrap items-center gap-1.5">
                        <span className="font-mono">{promo.product?.sku}</span>
                        <span>·</span>
                        <span>{promo.start_date} → {promo.end_date}</span>
                        {days !== null && promo.is_active && days < 0 && (
                          <span className="inline-flex items-center gap-1 rounded border border-red-300 dark:border-red-700/50 bg-red-500/10 px-1.5 py-0.5 text-xs font-medium text-red-600 dark:text-red-400">
                            <AlertTriangle className="h-3 w-3" />Expired
                          </span>
                        )}
                        {days !== null && promo.is_active && days >= 0 && days <= 2 && (
                          <span className="inline-flex items-center gap-1 rounded border border-red-200 dark:border-red-800/30 bg-red-500/10 px-1.5 py-0.5 text-xs font-medium text-red-500 dark:text-red-400">
                            <Clock className="h-3 w-3" />
                            {days === 0 ? "Expires today" : days === 1 ? "Expires tomorrow" : `Expires in ${days}d`}
                          </span>
                        )}
                        {days !== null && promo.is_active && days > 2 && days <= 7 && (
                          <span className="inline-flex items-center gap-1 rounded border border-amber-200 dark:border-amber-800/30 bg-amber-500/10 px-1.5 py-0.5 text-xs font-medium text-amber-600 dark:text-amber-400">
                            <Clock className="h-3 w-3" />Expires in {days}d
                          </span>
                        )}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => openEdit(promo)}
                        className="rounded-lg border border-zinc-200 dark:border-zinc-700 p-1.5 text-zinc-500 hover:border-primary/40 hover:text-primary transition-colors"
                        title="Edit"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleToggle(promo)}
                        className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-all ${
                          promo.is_active
                            ? "border-red-200 dark:border-red-800/30 text-red-400 hover:bg-red-500/10"
                            : "border-primary/30 text-primary hover:bg-primary/10"
                        }`}
                      >
                        {promo.is_active ? (
                          <span className="flex items-center gap-1"><XCircle className="h-3.5 w-3.5" />Deactivate</span>
                        ) : (
                          <span className="flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5" />Activate</span>
                        )}
                      </button>
                      <button
                        onClick={() => setDeleteId(promo.id)}
                        className="rounded-lg border border-zinc-200 dark:border-zinc-700 p-1.5 text-zinc-400 hover:border-red-300 hover:text-red-500 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </motion.div>
                );
              })
            )}
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
            onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
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
                  {modal.mode === "create" ? "New Promotion" : "Edit Promotion"}
                </h2>
                <button onClick={closeModal} className="rounded-lg p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors">
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Modal body */}
              <div className="px-5 py-4 space-y-4">

                {/* Product */}
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-zinc-600 dark:text-zinc-400">Product</label>
                  <div className="relative">
                    <select
                      value={form.product_id}
                      onChange={(e) => setForm((f) => ({ ...f, product_id: e.target.value }))}
                      className="w-full appearance-none rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 py-2.5 pl-3 pr-8 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="">Select a product…</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                  </div>
                </div>

                {/* Promo type */}
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-zinc-600 dark:text-zinc-400">Type</label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {(["discount", "npl", "bundle", "priority"] as Promotion["promo_type"][]).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, promo_type: t }))}
                        className={`rounded-lg border py-2 text-xs font-medium capitalize transition-all ${
                          form.promo_type === t
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:border-zinc-400"
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Discount % — only for discount type */}
                {form.promo_type === "discount" && (
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-zinc-600 dark:text-zinc-400">Discount %</label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={0.1}
                      value={form.discount_pct}
                      onChange={(e) => setForm((f) => ({ ...f, discount_pct: e.target.value }))}
                      placeholder="e.g. 20"
                      className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 py-2.5 px-3 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                )}

                {/* Dates */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-zinc-600 dark:text-zinc-400">Start date</label>
                    <input
                      type="date"
                      value={form.start_date}
                      onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))}
                      className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 py-2.5 px-3 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-zinc-600 dark:text-zinc-400">End date</label>
                    <input
                      type="date"
                      value={form.end_date}
                      onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))}
                      className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 py-2.5 px-3 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>

                {/* Active toggle */}
                <div className="flex items-center justify-between rounded-lg border border-zinc-200 dark:border-zinc-700 px-3 py-2.5">
                  <span className="text-sm text-foreground">Active immediately</span>
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, is_active: !f.is_active }))}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                      form.is_active ? "bg-primary" : "bg-zinc-300 dark:bg-zinc-600"
                    }`}
                  >
                    <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${form.is_active ? "translate-x-4" : "translate-x-0.5"}`} />
                  </button>
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

      {/* Delete confirmation modal */}
      <AnimatePresence>
        {deleteId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xl p-6"
            >
              <div className="flex items-start gap-3 mb-4">
                <div className="rounded-full bg-red-500/10 p-2">
                  <Trash2 className="h-4 w-4 text-red-500" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">Delete promotion?</p>
                  <p className="mt-1 text-sm text-zinc-500">
                    {(() => {
                      const promo = promotions.find((p) => p.id === deleteId);
                      return `${promo?.product?.name ?? "This promotion"} will be permanently removed.`;
                    })()}
                  </p>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setDeleteId(null)}
                  className="rounded-lg border border-zinc-200 dark:border-zinc-700 px-4 py-2 text-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex items-center gap-1.5 rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-60 transition-colors"
                >
                  {deleting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AuthGate>
  );
}
