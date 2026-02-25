"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Upload,
  RefreshCw,
  Brain,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Settings,
} from "lucide-react";
import { Navbar } from "@/components/shared/Navbar";
import { Footer } from "@/components/shared/Footer";
import { AuthGate } from "@/components/shared/AuthGate";
import { CsvDropzone } from "@/components/upload/CsvDropzone";
import { fadeInUp, staggerContainer, scaleIn } from "@/lib/animations";
import {
  uploadTransactionsCsv,
  uploadSalesmenCsv,
  uploadRetailersCsv,
  refreshRecommendations,
  triggerModelTrain,
} from "@/lib/api";

type UploadStatus = "idle" | "uploading" | "success" | "error";
type TrainStatus = "idle" | "training" | "success" | "error";
type RefreshStatus = "idle" | "refreshing" | "success" | "error";

export default function SettingsPage() {
  // Salesman upload state
  const [salesmanFile, setSalesmanFile] = useState<File | null>(null);
  const [salesmanUploadStatus, setSalesmanUploadStatus] = useState<UploadStatus>("idle");
  const [salesmanResult, setSalesmanResult] = useState<{ upserted: number } | null>(null);
  const [salesmanError, setSalesmanError] = useState<string | null>(null);

  // Retailer upload state
  const [retailerFile, setRetailerFile] = useState<File | null>(null);
  const [retailerUploadStatus, setRetailerUploadStatus] = useState<UploadStatus>("idle");
  const [retailerResult, setRetailerResult] = useState<{ upserted: number; warnings: string[] } | null>(null);
  const [retailerError, setRetailerError] = useState<string | null>(null);

  // Transaction upload state
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>("idle");
  const [uploadResult, setUploadResult] = useState<{
    inserted: number;
    retailers_affected: string[];
  } | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [trainStatus, setTrainStatus] = useState<TrainStatus>("idle");
  const [trainMessage, setTrainMessage] = useState<string | null>(null);

  const [refreshStatus, setRefreshStatus] = useState<RefreshStatus>("idle");

  const handleSalesmanUpload = async () => {
    if (!salesmanFile) return;
    setSalesmanUploadStatus("uploading");
    setSalesmanError(null);
    setSalesmanResult(null);
    try {
      const result = await uploadSalesmenCsv(salesmanFile);
      setSalesmanResult(result);
      setSalesmanUploadStatus("success");
    } catch (err) {
      setSalesmanError(err instanceof Error ? err.message : "Upload failed");
      setSalesmanUploadStatus("error");
    }
  };

  const handleRetailerUpload = async () => {
    if (!retailerFile) return;
    setRetailerUploadStatus("uploading");
    setRetailerError(null);
    setRetailerResult(null);
    try {
      const result = await uploadRetailersCsv(retailerFile);
      setRetailerResult(result);
      setRetailerUploadStatus("success");
    } catch (err) {
      setRetailerError(err instanceof Error ? err.message : "Upload failed");
      setRetailerUploadStatus("error");
    }
  };

  const handleUpload = async () => {
    if (!csvFile) return;
    setUploadStatus("uploading");
    setUploadError(null);
    setUploadResult(null);
    try {
      const result = await uploadTransactionsCsv(csvFile);
      setUploadResult(result);
      setUploadStatus("success");
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
      setUploadStatus("error");
    }
  };

  const handleRefresh = async () => {
    setRefreshStatus("refreshing");
    try {
      await refreshRecommendations();
      setRefreshStatus("success");
      setTimeout(() => setRefreshStatus("idle"), 3000);
    } catch {
      setRefreshStatus("error");
      setTimeout(() => setRefreshStatus("idle"), 3000);
    }
  };

  const handleTrain = async () => {
    setTrainStatus("training");
    setTrainMessage(null);
    try {
      const result = await triggerModelTrain();
      setTrainMessage(result.message);
      setTrainStatus("success");
    } catch (err) {
      setTrainMessage(err instanceof Error ? err.message : "Training failed");
      setTrainStatus("error");
    }
  };

  return (
    <AuthGate>
      <Navbar />
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        {/* Header */}
        <motion.div
          variants={fadeInUp}
          initial="hidden"
          animate="visible"
          className="mb-8"
        >
          <h1 className="text-3xl font-bold">
            <span className="bg-gradient-to-r from-zinc-900 via-zinc-700 to-zinc-500 dark:from-zinc-100 dark:via-zinc-300 dark:to-zinc-500 bg-clip-text text-transparent">
              Settings
            </span>
          </h1>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            Data ingestion, model management, and configuration.
          </p>
        </motion.div>

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="space-y-6"
        >
          {/* Salesman Data Upload */}
          <motion.section
            variants={scaleIn}
            className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 p-6"
          >
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2.5">
                <Upload className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="font-semibold text-foreground">
                  Salesman Data Upload
                </h2>
                <p className="text-xs text-zinc-500">
                  Upload CSV to bulk-import salesmen
                </p>
              </div>
            </div>

            <CsvDropzone
              onFileSelect={setSalesmanFile}
              disabled={salesmanUploadStatus === "uploading"}
            />

            <div className="mt-4 flex items-center gap-3">
              <button
                onClick={handleSalesmanUpload}
                disabled={!salesmanFile || salesmanUploadStatus === "uploading"}
                className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {salesmanUploadStatus === "uploading" ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    Upload &amp; Ingest
                  </>
                )}
              </button>

              {salesmanUploadStatus === "success" && salesmanResult && (
                <div className="flex items-center gap-1.5 text-sm text-primary">
                  <CheckCircle2 className="h-4 w-4" />
                  {salesmanResult.upserted} salesmen upserted
                </div>
              )}

              {salesmanUploadStatus === "error" && salesmanError && (
                <div className="flex items-center gap-1.5 text-sm text-red-400">
                  <AlertCircle className="h-4 w-4" />
                  {salesmanError}
                </div>
              )}
            </div>

            <div className="mt-4 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 p-3 text-xs text-zinc-500">
              <p className="font-medium text-zinc-600 dark:text-zinc-400 mb-1">Expected CSV format:</p>
              <code className="font-mono">
                name, code, region
              </code>
            </div>
          </motion.section>

          {/* Retailer Data Upload */}
          <motion.section
            variants={scaleIn}
            className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 p-6"
          >
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2.5">
                <Upload className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="font-semibold text-foreground">
                  Retailer Data Upload
                </h2>
                <p className="text-xs text-zinc-500">
                  Upload CSV to bulk-import retailers with salesman mappings
                </p>
              </div>
            </div>

            <CsvDropzone
              onFileSelect={setRetailerFile}
              disabled={retailerUploadStatus === "uploading"}
            />

            <div className="mt-4 flex items-center gap-3">
              <button
                onClick={handleRetailerUpload}
                disabled={!retailerFile || retailerUploadStatus === "uploading"}
                className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {retailerUploadStatus === "uploading" ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    Upload &amp; Ingest
                  </>
                )}
              </button>

              {retailerUploadStatus === "success" && retailerResult && (
                <div className="flex items-center gap-1.5 text-sm text-primary">
                  <CheckCircle2 className="h-4 w-4" />
                  {retailerResult.upserted} retailers upserted
                </div>
              )}

              {retailerUploadStatus === "error" && retailerError && (
                <div className="flex items-center gap-1.5 text-sm text-red-400">
                  <AlertCircle className="h-4 w-4" />
                  {retailerError}
                </div>
              )}
            </div>

            {retailerUploadStatus === "success" && retailerResult && retailerResult.warnings.length > 0 && (
              <div className="mt-3 rounded-lg border border-amber-200/50 dark:border-amber-800/20 bg-amber-50 dark:bg-amber-900/10 p-3 text-xs text-amber-700 dark:text-amber-400">
                <p className="font-medium mb-1">Warnings ({retailerResult.warnings.length}):</p>
                <ul className="list-disc list-inside space-y-0.5">
                  {retailerResult.warnings.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-4 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 p-3 text-xs text-zinc-500">
              <p className="font-medium text-zinc-600 dark:text-zinc-400 mb-1">Expected CSV format:</p>
              <code className="font-mono">
                name, code, region, tier, salesman_code
              </code>
            </div>
          </motion.section>

          {/* CSV Upload */}
          <motion.section
            variants={scaleIn}
            className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 p-6"
          >
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2.5">
                <Upload className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="font-semibold text-foreground">
                  Transaction Data Upload
                </h2>
                <p className="text-xs text-zinc-500">
                  Upload CSV to ingest purchase history
                </p>
              </div>
            </div>

            <CsvDropzone
              onFileSelect={setCsvFile}
              disabled={uploadStatus === "uploading"}
            />

            <div className="mt-4 flex items-center gap-3">
              <button
                onClick={handleUpload}
                disabled={!csvFile || uploadStatus === "uploading"}
                className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploadStatus === "uploading" ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    Upload &amp; Ingest
                  </>
                )}
              </button>

              {uploadStatus === "success" && uploadResult && (
                <div className="flex items-center gap-1.5 text-sm text-primary">
                  <CheckCircle2 className="h-4 w-4" />
                  {uploadResult.inserted} rows inserted · {uploadResult.retailers_affected.length} retailers updated
                </div>
              )}

              {uploadStatus === "error" && uploadError && (
                <div className="flex items-center gap-1.5 text-sm text-red-400">
                  <AlertCircle className="h-4 w-4" />
                  {uploadError}
                </div>
              )}
            </div>

            <div className="mt-4 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 p-3 text-xs text-zinc-500">
              <p className="font-medium text-zinc-600 dark:text-zinc-400 mb-1">Expected CSV format:</p>
              <code className="font-mono">
                transaction_date, retailer_code, retailer_name, sku, product_name, quantity, amount
              </code>
            </div>
          </motion.section>

          {/* Recommendation Refresh */}
          <motion.section
            variants={scaleIn}
            className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 p-6"
          >
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-lg bg-secondary/10 p-2.5">
                <RefreshCw className="h-5 w-5 text-secondary" />
              </div>
              <div>
                <h2 className="font-semibold text-foreground">
                  Refresh Recommendations
                </h2>
                <p className="text-xs text-zinc-500">
                  Recalculate Phase 1 rule-based scores for all retailers
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleRefresh}
                disabled={refreshStatus === "refreshing"}
                className="flex items-center gap-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 px-5 py-2.5 text-sm font-medium text-zinc-700 dark:text-zinc-300 transition-all hover:border-secondary/40 hover:text-secondary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {refreshStatus === "refreshing" ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Refreshing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4" />
                    Refresh All
                  </>
                )}
              </button>

              {refreshStatus === "success" && (
                <div className="flex items-center gap-1.5 text-sm text-primary">
                  <CheckCircle2 className="h-4 w-4" />
                  Recommendations refreshed
                </div>
              )}
              {refreshStatus === "error" && (
                <div className="flex items-center gap-1.5 text-sm text-red-400">
                  <AlertCircle className="h-4 w-4" />
                  Refresh failed
                </div>
              )}
            </div>
          </motion.section>

          {/* ML Model Training */}
          <motion.section
            variants={scaleIn}
            className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 p-6"
          >
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-lg bg-accent/10 p-2.5">
                <Brain className="h-5 w-5 text-accent" />
              </div>
              <div>
                <h2 className="font-semibold text-foreground">
                  ML Model Training
                </h2>
                <p className="text-xs text-zinc-500">
                  Phase 2 — Retrain ALS collaborative filtering model
                </p>
              </div>
            </div>

            <div className="mb-4 rounded-lg border border-amber-200/50 dark:border-amber-800/20 bg-amber-50 dark:bg-amber-900/10 p-3 text-xs text-amber-700 dark:text-amber-400">
              Training uses all available transaction data to build the ALS model. This may take a few minutes. The system falls back to Phase 1 rules if the model is unavailable.
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleTrain}
                disabled={trainStatus === "training"}
                className="flex items-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-dark disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {trainStatus === "training" ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Training...
                  </>
                ) : (
                  <>
                    <Brain className="h-4 w-4" />
                    Retrain Model
                  </>
                )}
              </button>

              {trainStatus === "success" && trainMessage && (
                <div className="flex items-center gap-1.5 text-sm text-primary">
                  <CheckCircle2 className="h-4 w-4" />
                  {trainMessage}
                </div>
              )}
              {trainStatus === "error" && trainMessage && (
                <div className="flex items-center gap-1.5 text-sm text-red-400">
                  <AlertCircle className="h-4 w-4" />
                  {trainMessage}
                </div>
              )}
            </div>
          </motion.section>

          {/* Config */}
          <motion.section
            variants={scaleIn}
            className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 p-6"
          >
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-lg bg-zinc-200 dark:bg-zinc-700 p-2.5">
                <Settings className="h-5 w-5 text-zinc-600 dark:text-zinc-400" />
              </div>
              <div>
                <h2 className="font-semibold text-foreground">
                  Scoring Configuration
                </h2>
                <p className="text-xs text-zinc-500">
                  Phase 1 rule weights (read-only — configure via env)
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {[
                { label: "Recency Score Weight", value: "0.50", desc: "Higher = inactive products rank higher" },
                { label: "Promo Boost", value: "+0.30", desc: "Flat boost for products in active promo" },
                { label: "New Product Bonus", value: "+0.20", desc: "Products never bought by this retailer" },
                { label: "Decline Flag", value: "+0.15", desc: "Products with declining order frequency" },
              ].map(({ label, value, desc }) => (
                <div
                  key={label}
                  className="flex items-center justify-between rounded-lg bg-zinc-50 dark:bg-zinc-800/50 px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">{label}</p>
                    <p className="text-xs text-zinc-500">{desc}</p>
                  </div>
                  <span className="font-mono text-sm font-semibold text-primary">{value}</span>
                </div>
              ))}
            </div>
          </motion.section>
        </motion.div>
      </main>
      <Footer />
    </AuthGate>
  );
}
