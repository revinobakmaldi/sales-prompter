"use client";

import { useCallback, useState } from "react";
import { motion } from "framer-motion";
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2 } from "lucide-react";
import { fadeInUp } from "@/lib/animations";
import { formatBytes } from "@/lib/utils";

interface CsvDropzoneProps {
  onFileSelect: (file: File) => void;
  disabled?: boolean;
  accept?: string;
}

const MAX_SIZE = 50 * 1024 * 1024; // 50MB

export function CsvDropzone({
  onFileSelect,
  disabled,
  accept = ".csv",
}: CsvDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const validateAndSelect = useCallback(
    (files: FileList | File[]) => {
      setError(null);
      const file = Array.from(files)[0];
      if (!file) return;

      if (!file.name.toLowerCase().endsWith(".csv")) {
        setError("Only CSV files are supported.");
        return;
      }
      if (file.size > MAX_SIZE) {
        setError(
          `File is too large (${formatBytes(file.size)}). Max 50MB.`
        );
        return;
      }
      if (file.size === 0) {
        setError("File is empty.");
        return;
      }

      setSelectedFile(file);
      onFileSelect(file);
    },
    [onFileSelect]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (disabled) return;
      validateAndSelect(e.dataTransfer.files);
    },
    [disabled, validateAndSelect]
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (!disabled) setIsDragging(true);
    },
    [disabled]
  );

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleClick = useCallback(() => {
    if (disabled) return;
    const input = document.createElement("input");
    input.type = "file";
    input.accept = accept;
    input.onchange = (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (files && files.length > 0) validateAndSelect(files);
    };
    input.click();
  }, [disabled, accept, validateAndSelect]);

  return (
    <motion.div variants={fadeInUp} initial="hidden" animate="visible">
      <div
        onClick={handleClick}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`group relative cursor-pointer rounded-2xl border-2 border-dashed p-10 text-center transition-all duration-300 ${
          isDragging
            ? "border-primary bg-primary/10"
            : selectedFile
              ? "border-primary/50 bg-primary/5"
              : "border-zinc-300 dark:border-zinc-700 hover:border-primary/50 hover:bg-zinc-50 dark:hover:bg-zinc-900"
        } ${disabled ? "pointer-events-none opacity-50" : ""}`}
      >
        <div className="flex flex-col items-center gap-4">
          <div
            className={`rounded-2xl p-4 transition-colors ${
              isDragging
                ? "bg-primary/20"
                : selectedFile
                  ? "bg-primary/10"
                  : "bg-zinc-100 dark:bg-zinc-800 group-hover:bg-primary/10"
            }`}
          >
            {selectedFile ? (
              <CheckCircle2 className="h-10 w-10 text-primary" />
            ) : isDragging ? (
              <FileSpreadsheet className="h-10 w-10 text-primary" />
            ) : (
              <Upload className="h-10 w-10 text-zinc-400 dark:text-zinc-500 group-hover:text-primary" />
            )}
          </div>
          <div>
            {selectedFile ? (
              <>
                <p className="text-lg font-medium text-primary">
                  {selectedFile.name}
                </p>
                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                  {formatBytes(selectedFile.size)} · Click to change
                </p>
              </>
            ) : (
              <>
                <p className="text-lg font-medium text-foreground">
                  {isDragging
                    ? "Drop your CSV here"
                    : "Drop CSV file here or click to browse"}
                </p>
                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                  CSV files up to 50MB. Expected columns: transaction_date,
                  retailer_code, retailer_name, sku, product_name, quantity,
                  amount
                </p>
              </>
            )}
          </div>
        </div>
      </div>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-3 flex items-center gap-2 rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-400"
        >
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </motion.div>
      )}
    </motion.div>
  );
}
