"use client";

import * as React from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

const TYPE_TABS: { label: string; value: string | null }[] = [
  { label: "All", value: null },
  { label: "Income", value: "INCOME" },
  { label: "Expenses", value: "EXPENSE" },
  { label: "Transfers", value: "TRANSFER" },
  { label: "Savings", value: "SAVING" },
];

export function TransactionFilters({ accounts }: { accounts: { id: string; name: string }[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function updateParam(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`${pathname}?${params.toString()}`);
  }

  const activeType = searchParams.get("type");
  const accountId = searchParams.get("accountId") ?? "ALL";
  const month = searchParams.get("month") ?? "";

  return (
    <div className="flex flex-wrap items-center gap-4 px-4 sm:px-6 lg:px-10 py-4 border-b border-rule">
      <div className="flex items-center gap-1 rounded-sm border border-rule p-1 overflow-x-auto max-w-full">
        {TYPE_TABS.map((tab) => (
          <button
            key={tab.label}
            onClick={() => updateParam("type", tab.value)}
            className={cn(
              "px-3 py-1.5 text-sm rounded-sm transition-colors whitespace-nowrap",
              activeType === tab.value ? "bg-accent text-paper" : "text-ink-muted hover:text-ink"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <Select value={accountId} onValueChange={(v) => updateParam("accountId", v === "ALL" ? null : v)}>
        <SelectTrigger className="w-44">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">All accounts</SelectItem>
          {accounts.map((a) => (
            <SelectItem key={a.id} value={a.id}>
              {a.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <input
        type="month"
        value={month}
        onChange={(e) => updateParam("month", e.target.value || null)}
        className="h-10 rounded-sm border border-rule bg-paper px-3 text-sm text-ink focus:outline-none focus:ring-1 focus:ring-accent"
      />

      {(activeType || accountId !== "ALL" || month) && (
        <button
          onClick={() => router.push(pathname)}
          className="text-xs text-ink-muted hover:text-ink underline underline-offset-2"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}
