"use client";

import * as React from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";
import { Amount } from "@/components/ui/amount";
import { usePinnedTooltip } from "@/components/reports/use-pinned-tooltip";

export type CategorySlice = { category: string; amount: number; percent: number };

// Keep report colors coordinated with the indigo-led interface.
const PALETTE = [
  "#5548ad",
  "#7668c4",
  "#3f6f9f",
  "#a34f70",
  "#8b78bd",
  "#4e8c9b",
  "#b77a91",
  "#6688ba",
  "#7b9cbd",
  "#9a86ad",
];

export function CategoryBreakdownChart({
  expenseData,
  incomeData,
  monthLabel,
}: {
  expenseData: CategorySlice[];
  incomeData: CategorySlice[];
  monthLabel: string;
}) {
  const { ref, pin, tooltipProps, stopClick } = usePinnedTooltip();
  // Per category, shared by the tooltip's and the list's eye icons so a revealed
  // amount stays revealed as the tooltip moves between slices.
  const [revealed, setRevealed] = React.useState<Record<string, boolean>>({});
  const reveal = (category: string, v: boolean) => setRevealed((r) => ({ ...r, [category]: v }));

  return (
    <div className="px-4 sm:px-6 lg:px-10 py-6 sm:py-8 grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6">
      <div ref={ref} className="min-w-0 border border-rule rounded-sm p-6 sm:p-7">
        <p className="text-xs uppercase tracking-[0.14em] text-ink-muted mb-4">
          Expenses by Category · {monthLabel}
        </p>

        {expenseData.length === 0 ? (
          <p className="text-sm text-ink-muted py-10 text-center">No expenses in {monthLabel}.</p>
        ) : (
          <>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={expenseData}
                    dataKey="amount"
                    nameKey="category"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={2}
                    stroke="var(--paper)"
                    strokeWidth={2}
                    onClick={pin}
                  >
                    {expenseData.map((_, i) => (
                      <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    {...tooltipProps}
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const category = String(payload[0].name);
                      return (
                        <div onClick={stopClick} className="rounded-sm border border-rule bg-surface px-3 py-2 text-xs shadow-sm">
                          <p className="mb-1 text-ink-muted">{category}</p>
                          <Amount
                            value={Number(payload[0].value)}
                            className="ledger-amount text-xs"
                            visible={!!revealed[category]}
                            onVisibleChange={(v) => reveal(category, v)}
                          />
                        </div>
                      );
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-1.5 mt-2">
              {expenseData.map((d, i) => (
                <div key={d.category} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 min-w-0">
                    <span
                      className="size-2.5 rounded-full shrink-0"
                      style={{ background: PALETTE[i % PALETTE.length] }}
                    />
                    <span className="truncate">{d.category}</span>
                  </span>
                  <span className="inline-flex min-w-0 items-center gap-1 text-ink-muted shrink-0">
                    <Amount
                      value={d.amount}
                      className="ledger-amount text-ink-muted"
                      visible={!!revealed[d.category]}
                      onVisibleChange={(v) => reveal(d.category, v)}
                    />
                    <span>· {d.percent}%</span>
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="min-w-0 border border-rule rounded-sm p-6 sm:p-7">
        <p className="text-xs uppercase tracking-[0.14em] text-ink-muted mb-4">
          Income by Category · {monthLabel}
        </p>

        {incomeData.length === 0 ? (
          <p className="text-sm text-ink-muted py-10 text-center">No income in {monthLabel}.</p>
        ) : (
          <div className="space-y-3">
            {incomeData.map((d) => (
              <div key={d.category}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="truncate">{d.category}</span>
                  <span className="inline-flex min-w-0 items-center gap-1 shrink-0">
                    <Amount value={d.amount} className="ledger-amount" />
                    <span>· {d.percent}%</span>
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-surface overflow-hidden">
                  <div className={cn("h-full bg-credit rounded-full")} style={{ width: `${d.percent}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
