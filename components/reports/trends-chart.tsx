"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import { Amount } from "@/components/ui/amount";

export type MonthTrend = { label: string; income: number; expenses: number };

export function TrendsChart({ data }: { data: MonthTrend[] }) {
  const allZero = data.every((d) => d.income === 0 && d.expenses === 0);
  const maxValue = Math.max(...data.flatMap((d) => [d.income, d.expenses]), 0);
  const chartMax = maxValue > 0 ? Math.ceil((maxValue * 1.15) / 100) * 100 : 100;

  function formatAxisValue(value: number) {
    if (value >= 1_000_000) return `Rs. ${(value / 1_000_000).toFixed(1)}m`;
    if (value >= 1_000) return `Rs. ${(value / 1_000).toFixed(1)}k`;
    return `Rs. ${Math.round(value)}`;
  }

  return (
    <div className="mx-4 sm:mx-6 lg:mx-10 my-6 sm:my-8 border border-rule rounded-sm p-6 sm:p-7">
      <p className="text-xs uppercase tracking-[0.14em] text-ink-muted mb-4">
        Income vs. Expenses — Last {data.length} Months
      </p>

      {allZero ? (
        <p className="text-sm text-ink-muted py-16 text-center">
          Not enough history yet — add some transactions to see trends here.
        </p>
      ) : (
        <div className="h-72 min-w-0 sm:h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 14, right: 8, bottom: 4, left: 4 }} barGap={4} barCategoryGap="18%">
              <CartesianGrid vertical={false} stroke="var(--rule)" />
              <XAxis
                dataKey="label"
                interval={0}
                tick={{ fontSize: 11, fill: "var(--ink-muted)" }}
                axisLine={{ stroke: "var(--rule)" }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "var(--ink-muted)" }}
                axisLine={false}
                tickLine={false}
                width={62}
                domain={[0, chartMax]}
                tickCount={5}
                allowDataOverflow={false}
                tickFormatter={formatAxisValue}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  return (
                    <div className="rounded-sm border border-rule bg-surface px-3 py-2 text-xs shadow-sm">
                      <p className="mb-1 text-ink-muted">{label}</p>
                      {payload.map((entry) => (
                        <div key={String(entry.dataKey)} className="flex items-center justify-between gap-4">
                          <span>{entry.name}</span>
                          <Amount value={Number(entry.value)} className="ledger-amount text-xs" />
                        </div>
                      ))}
                    </div>
                  );
                }}
                contentStyle={{
                  background: "var(--surface)",
                  border: "1px solid var(--rule)",
                  borderRadius: 2,
                  fontSize: 13,
                }}
              />
              <Legend wrapperStyle={{ fontSize: 13 }} />
              <Bar dataKey="income" name="Income" fill="var(--credit)" radius={[2, 2, 0, 0]} maxBarSize={34} />
              <Bar dataKey="expenses" name="Expenses" fill="var(--debit)" radius={[2, 2, 0, 0]} maxBarSize={34} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
