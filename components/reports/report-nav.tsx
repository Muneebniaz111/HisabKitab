"use client";

import { usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";

const TABS = [
  { value: "ledger", label: "Monthly Ledger" },
  { value: "categories", label: "Category Breakdown" },
  { value: "trends", label: "Trends" },
  { value: "statement", label: "Account Statement" },
] as const;

export function ReportNav({ view }: { view: string }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return (
    <div className="flex items-center gap-1 rounded-sm border border-rule p-1 w-full sm:w-fit overflow-x-auto">
      {TABS.map((tab) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set("view", tab.value);
        // Trends spans multiple months — a single-month filter doesn't apply there.
        if (tab.value === "trends") params.delete("month");

        return (
          <Link
            key={tab.value}
            href={`${pathname}?${params.toString()}`}
            className={cn(
              "px-3 py-1.5 text-sm rounded-sm transition-colors whitespace-nowrap",
              view === tab.value ? "bg-accent text-paper" : "text-ink-muted hover:text-ink"
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
