"use client";

import { cn } from "@/lib/utils";

/** Single-choice pill toggle — Expense / Income / Transfer, Add Funds / Withdraw, etc. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: React.ReactNode }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div
      className="grid gap-1 rounded-sm border border-rule p-1"
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          aria-pressed={value === o.value}
          className={cn(
            "flex items-center justify-center gap-1.5 rounded-sm py-1.5 text-sm transition-colors",
            value === o.value ? "bg-accent text-paper" : "text-ink-muted hover:text-ink hover:bg-accent-surface"
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
