"use client";

import * as React from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Amount } from "@/components/ui/amount";
import { Segmented } from "@/components/ui/segmented";
import { CsvExportButton } from "@/components/reports/csv-export-button";
import { sumMoney } from "@/lib/money";
import { formatDate } from "@/lib/dates";

export type LensTransaction = {
  id: string;
  date: string; // ISO
  description: string;
  notes: string;
  accountName: string;
  amount: number;
};

export type LensCategory = {
  key: string;
  type: "INCOME" | "EXPENSE";
  name: string;
  total: number;
  transactions: LensTransaction[]; // newest first
};

export function SpendLens({
  monthLabel,
  categories,
}: {
  monthLabel: string;
  categories: LensCategory[]; // sorted by total, largest first
}) {
  const [type, setType] = React.useState<"EXPENSE" | "INCOME">("EXPENSE");
  const [openKey, setOpenKey] = React.useState<string | null>(null);

  const shown = categories.filter((c) => c.type === type);
  const grandTotal = sumMoney(shown.map((c) => c.total));
  const count = shown.reduce((n, c) => n + c.transactions.length, 0);
  const isExpense = type === "EXPENSE";

  return (
    <div className="px-4 sm:px-6 lg:px-10 py-6 sm:py-8 space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="w-full sm:w-64">
          <Segmented
            options={[
              { value: "EXPENSE", label: "Expenses" },
              { value: "INCOME", label: "Income" },
            ]}
            value={type}
            onChange={(v) => {
              setType(v);
              setOpenKey(null);
            }}
          />
        </div>
        <div className="sm:text-right">
          <p className="text-xs uppercase tracking-[0.14em] text-ink-muted mb-1">
            {isExpense ? "Spent" : "Earned"} in {monthLabel} · {count} {count === 1 ? "entry" : "entries"}
          </p>
          <Amount
            value={grandTotal}
            className={cn("ledger-amount text-xl sm:text-2xl", isExpense ? "text-debit" : "text-credit")}
          />
        </div>
      </div>

      {shown.length === 0 ? (
        <p className="border border-rule rounded-sm px-6 py-16 text-center text-sm text-ink-muted">
          No {isExpense ? "expenses" : "income"} in {monthLabel}.
        </p>
      ) : (
        <div className="border border-rule rounded-sm divide-y divide-rule">
          {shown.map((c) => (
            <CategoryRow
              key={c.key}
              category={c}
              percent={grandTotal > 0 ? Math.round((c.total / grandTotal) * 1000) / 10 : 0}
              monthLabel={monthLabel}
              open={openKey === c.key}
              onToggle={() => setOpenKey(openKey === c.key ? null : c.key)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CategoryRow({
  category,
  percent,
  monthLabel,
  open,
  onToggle,
}: {
  category: LensCategory;
  percent: number;
  monthLabel: string;
  open: boolean;
  onToggle: () => void;
}) {
  const isExpense = category.type === "EXPENSE";
  const n = category.transactions.length;

  return (
    <div className={cn(open && "bg-accent-surface/40")}>
      {/* The eye toggle is its own button, so it sits beside the row's
          button instead of inside it. */}
      <div className="flex items-center gap-3 pr-4 sm:pr-6">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          className="group flex flex-1 min-w-0 items-center gap-3 pl-4 sm:pl-6 py-4 text-left focus:outline-none focus-visible:ring-1 focus-visible:ring-accent"
        >
          <ChevronRight
            className={cn(
              "size-4 shrink-0 text-ink-muted transition-transform group-hover:text-accent",
              open && "rotate-90 text-accent"
            )}
            strokeWidth={1.75}
          />
          <span className="flex-1 min-w-0">
            <span className="flex flex-wrap items-baseline gap-x-2">
              <span className={cn("text-sm truncate max-w-full group-hover:text-accent", open && "text-accent")}>
                {category.name}
              </span>
              <span className="text-xs text-ink-muted shrink-0">
                {n} {n === 1 ? "entry" : "entries"} · {percent}%
              </span>
            </span>
            <span className="mt-2 block h-1 rounded-full bg-rule/60 overflow-hidden">
              <span
                className={cn("block h-full rounded-full", isExpense ? "bg-debit" : "bg-credit")}
                style={{ width: `${percent}%` }}
              />
            </span>
          </span>
        </button>
        {/* Never shrinks: on a narrow phone the name truncates, not the total. */}
        <span className="shrink-0 max-w-[55%]">
          <Amount value={category.total} className="ledger-amount text-sm" />
        </span>
      </div>

      {open && (
        <div className="px-2 sm:px-6 pb-4 sm:pb-5">
          <div className="border border-rule rounded-sm bg-paper">
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-rule">
              <p className="text-xs uppercase tracking-[0.14em] text-ink-muted">
                {category.name} · {monthLabel}
              </p>
              <CsvExportButton
                filename={`hisab-kitab-${category.name}-${monthLabel}.csv`.replace(/\s+/g, "-")}
                headers={["Day", "Date", "Description", "Notes", "Account", "Amount"]}
                rows={category.transactions.map((t) => [
                  formatDate(t.date, { weekday: "long" }),
                  t.date.slice(0, 10),
                  t.description,
                  t.notes,
                  t.accountName,
                  t.amount.toFixed(2),
                ])}
              />
            </div>

            {/* Phones and tablets: stacked rows, nothing to scroll sideways. */}
            <ul className="lg:hidden divide-y divide-rule/60">
              {category.transactions.map((t) => (
                <li key={t.id} className="flex items-start justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-sm break-words">
                      {t.description || <span className="text-ink-muted">No description</span>}
                    </p>
                    {t.notes && <p className="text-xs text-ink-muted break-words">{t.notes}</p>}
                    <p className="text-xs text-ink-muted mt-0.5">
                      {formatDate(t.date, { weekday: "long" })} ·{" "}
                      {formatDate(t.date, { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                    {t.accountName && <p className="text-xs text-ink-muted truncate">{t.accountName}</p>}
                  </div>
                  <span className="shrink-0 max-w-[50%]">
                    <Amount
                      value={t.amount}
                      prefix={isExpense ? "-" : "+"}
                      className={cn("ledger-amount text-sm", isExpense ? "text-debit" : "text-credit")}
                    />
                  </span>
                </li>
              ))}
            </ul>

            {/* Desktop: a proper table. */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[10px] uppercase tracking-[0.14em] text-ink-muted border-b border-rule/60">
                    <th className="font-normal px-4 py-2">Day</th>
                    <th className="font-normal px-4 py-2">Date</th>
                    <th className="font-normal px-4 py-2">Description</th>
                    <th className="font-normal px-4 py-2">Account</th>
                    <th className="font-normal px-4 py-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-rule/60">
                  {category.transactions.map((t) => (
                    <tr key={t.id} className="align-top">
                      <td className="px-4 py-2.5 whitespace-nowrap text-ink-muted">
                        {formatDate(t.date, { weekday: "long" })}
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        {formatDate(t.date, { day: "numeric", month: "short", year: "numeric" })}
                      </td>
                      <td className="px-4 py-2.5 min-w-40">
                        <p>{t.description || <span className="text-ink-muted">—</span>}</p>
                        {t.notes && <p className="text-xs text-ink-muted">{t.notes}</p>}
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap text-ink-muted">
                        {t.accountName}
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap text-right">
                        <Amount
                          value={t.amount}
                          prefix={isExpense ? "-" : "+"}
                          className={cn("ledger-amount text-sm", isExpense ? "text-debit" : "text-credit")}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
