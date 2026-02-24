"use client";

import { useState } from "react";
import { ChevronUp, ChevronDown } from "lucide-react";
import { formatDate, formatCurrency } from "@/lib/utils";
import type { Transaction } from "@/lib/types";

interface PurchaseHistoryProps {
  transactions: Transaction[];
}

type SortKey = "transaction_date" | "quantity" | "amount";

export function PurchaseHistory({ transactions }: PurchaseHistoryProps) {
  const [sortKey, setSortKey] = useState<SortKey>("transaction_date");
  const [sortDesc, setSortDesc] = useState(true);

  const sorted = [...transactions].sort((a, b) => {
    const aVal = a[sortKey];
    const bVal = b[sortKey];
    if (aVal < bVal) return sortDesc ? 1 : -1;
    if (aVal > bVal) return sortDesc ? -1 : 1;
    return 0;
  });

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDesc(!sortDesc);
    } else {
      setSortKey(key);
      setSortDesc(true);
    }
  };

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return null;
    return sortDesc ? (
      <ChevronDown className="h-3 w-3" />
    ) : (
      <ChevronUp className="h-3 w-3" />
    );
  };

  if (transactions.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-zinc-500">
        No purchase history found.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
            <th className="px-4 py-3 text-left font-medium text-zinc-600 dark:text-zinc-400">
              Product
            </th>
            <th
              className="px-4 py-3 text-left font-medium text-zinc-600 dark:text-zinc-400 cursor-pointer hover:text-foreground"
              onClick={() => handleSort("transaction_date")}
            >
              <span className="flex items-center gap-1">
                Date
                <SortIcon col="transaction_date" />
              </span>
            </th>
            <th
              className="px-4 py-3 text-right font-medium text-zinc-600 dark:text-zinc-400 cursor-pointer hover:text-foreground"
              onClick={() => handleSort("quantity")}
            >
              <span className="flex items-center justify-end gap-1">
                Qty
                <SortIcon col="quantity" />
              </span>
            </th>
            <th
              className="px-4 py-3 text-right font-medium text-zinc-600 dark:text-zinc-400 cursor-pointer hover:text-foreground"
              onClick={() => handleSort("amount")}
            >
              <span className="flex items-center justify-end gap-1">
                Amount
                <SortIcon col="amount" />
              </span>
            </th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((tx, i) => (
            <tr
              key={tx.id}
              className={`border-b border-zinc-100 dark:border-zinc-800/50 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/30 ${
                i === sorted.length - 1 ? "border-b-0" : ""
              }`}
            >
              <td className="px-4 py-3">
                <p className="font-medium text-foreground">
                  {tx.product?.name ?? "Unknown"}
                </p>
                <p className="text-xs text-zinc-500">{tx.product?.sku}</p>
              </td>
              <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                {formatDate(tx.transaction_date)}
              </td>
              <td className="px-4 py-3 text-right text-zinc-700 dark:text-zinc-300">
                {tx.quantity.toLocaleString("id-ID")}
              </td>
              <td className="px-4 py-3 text-right font-medium text-foreground">
                {formatCurrency(tx.amount)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
