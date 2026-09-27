"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import { formatCurrency } from "@/lib/utils";

export type MonthTrend = { label: string; income: number; expenses: number };

export function TrendsChart({ data }: { data: MonthTrend[] }) {
  const allZero = data.every((d) => d.income === 0 && d.expenses === 0);

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
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} barGap={4}>
              <CartesianGrid vertical={false} stroke="var(--rule)" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 12, fill: "var(--ink-muted)" }}
                axisLine={{ stroke: "var(--rule)" }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 12, fill: "var(--ink-muted)" }}
                axisLine={false}
                tickLine={false}
                width={70}
                tickFormatter={(v) => formatCurrency(v)}
              />
              <Tooltip
                formatter={(value) => formatCurrency(Number(value))}
                contentStyle={{
                  background: "var(--surface)",
                  border: "1px solid var(--rule)",
                  borderRadius: 2,
                  fontSize: 13,
                }}
              />
              <Legend wrapperStyle={{ fontSize: 13 }} />
              <Bar dataKey="income" name="Income" fill="var(--credit)" radius={[2, 2, 0, 0]} />
              <Bar dataKey="expenses" name="Expenses" fill="var(--debit)" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
