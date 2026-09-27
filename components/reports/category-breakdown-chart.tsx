"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { cn, formatCurrency } from "@/lib/utils";

export type CategorySlice = { category: string; amount: number; percent: number };

// A muted, ink-and-paper-consistent palette — no bright saturated defaults.
const PALETTE = [
  "#8c2f2f",
  "#1f3b57",
  "#2f5d42",
  "#a3703c",
  "#6b5b95",
  "#3c6e71",
  "#b0413e",
  "#4a6fa5",
  "#7c9a6d",
  "#9b6a6c",
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
  return (
    <div className="px-4 sm:px-6 lg:px-10 py-6 sm:py-8 grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6">
      <div className="border border-rule rounded-sm p-6 sm:p-7">
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
                  >
                    {expenseData.map((_, i) => (
                      <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => formatCurrency(Number(value))}
                    contentStyle={{
                      background: "var(--surface)",
                      border: "1px solid var(--rule)",
                      borderRadius: 2,
                      fontSize: 13,
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
                  <span className="ledger-amount text-ink-muted shrink-0">
                    {formatCurrency(d.amount)} · {d.percent}%
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="border border-rule rounded-sm p-6 sm:p-7">
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
                  <span className="ledger-amount shrink-0">
                    {formatCurrency(d.amount)} · {d.percent}%
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
