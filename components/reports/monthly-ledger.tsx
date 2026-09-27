import { ArrowDownLeft, ArrowUpRight, ArrowLeftRight, PiggyBank } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { CsvExportButton } from "@/components/reports/csv-export-button";
import type { LedgerRow } from "@/lib/ledger-query";

export function MonthlyLedger({
  monthLabel,
  rows,
}: {
  monthLabel: string;
  rows: LedgerRow[];
}) {
  const totalIncome = rows.filter((r) => r.type === "INCOME").reduce((s, r) => s + r.amount, 0);
  const totalExpenses = rows.filter((r) => r.type === "EXPENSE").reduce((s, r) => s + r.amount, 0);
  const net = totalIncome - totalExpenses;

  const csvRows = rows.map((r) => [
    r.date.slice(0, 10),
    r.type,
    r.description,
    r.type === "TRANSFER" ? (r.fromAccountName ?? "") : (r.accountName ?? ""),
    r.type === "TRANSFER" ? (r.toAccountName ?? "") : (r.categoryName ?? ""),
    r.amount.toFixed(2),
  ]);

  return (
    <div className="px-4 sm:px-6 lg:px-10 py-6 sm:py-8 space-y-6 sm:space-y-8">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
        <div className="border border-rule rounded-sm bg-surface px-6 py-5 sm:py-6">
          <p className="text-xs uppercase tracking-[0.14em] text-ink-muted mb-2.5">Income</p>
          <p className="ledger-amount text-xl sm:text-2xl text-credit">+{formatCurrency(totalIncome)}</p>
        </div>
        <div className="border border-rule rounded-sm bg-surface px-6 py-5 sm:py-6">
          <p className="text-xs uppercase tracking-[0.14em] text-ink-muted mb-2.5">Expenses</p>
          <p className="ledger-amount text-xl sm:text-2xl text-debit">-{formatCurrency(totalExpenses)}</p>
        </div>
        <div className="border border-rule rounded-sm bg-surface px-6 py-5 sm:py-6">
          <p className="text-xs uppercase tracking-[0.14em] text-ink-muted mb-2.5">Net</p>
          <p className={cn("ledger-amount text-xl sm:text-2xl", net >= 0 ? "text-credit" : "text-debit")}>
            {net >= 0 ? "+" : "-"}
            {formatCurrency(Math.abs(net))}
          </p>
        </div>
      </div>

      <div className="border border-rule rounded-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-b border-rule">
          <p className="text-xs uppercase tracking-[0.14em] text-ink-muted">{monthLabel} Ledger</p>
          <CsvExportButton
            filename={`hisab-kitab-ledger-${monthLabel.replace(" ", "-")}.csv`}
            headers={["Date", "Type", "Description", "Account / From", "Category / To", "Amount"]}
            rows={csvRows}
          />
        </div>

        {rows.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-ink-muted">No transactions in {monthLabel}.</p>
        ) : (
          <div className="divide-y divide-rule/60">
            {rows.map((r) => {
              const isWithdrawal = r.type === "SAVING" && r.amount < 0;
              const isPositive = r.type === "INCOME" || isWithdrawal;
              const isNegative = r.type === "EXPENSE" || (r.type === "SAVING" && !isWithdrawal);

              return (
                <div key={r.id} className="flex items-center justify-between gap-3 px-4 sm:px-6 py-2.5">
                  <div className="flex items-center gap-3 min-w-0">
                    {r.type === "INCOME" ? (
                      <ArrowDownLeft className="size-4 text-credit shrink-0" strokeWidth={2} />
                    ) : r.type === "EXPENSE" ? (
                      <ArrowUpRight className="size-4 text-debit shrink-0" strokeWidth={2} />
                    ) : r.type === "SAVING" ? (
                      <PiggyBank className="size-4 text-accent shrink-0" strokeWidth={2} />
                    ) : (
                      <ArrowLeftRight className="size-4 text-accent shrink-0" strokeWidth={2} />
                    )}
                    <div className="min-w-0">
                      <p className="text-sm truncate">
                        {r.description || (r.type === "TRANSFER" ? "Transfer" : r.categoryName)}
                      </p>
                      <p className="text-xs text-ink-muted truncate">
                        {r.type === "TRANSFER"
                          ? `${r.fromAccountName} → ${r.toAccountName}`
                          : r.type === "SAVING"
                            ? `${r.categoryName} · ${r.accountName}`
                            : `${r.accountName} · ${r.categoryName}`}
                        {" · "}
                        {new Date(r.date).toLocaleDateString("en-PK", { day: "numeric", month: "short" })}
                      </p>
                    </div>
                  </div>
                  <span
                    className={cn(
                      "ledger-amount text-sm shrink-0",
                      isPositive && "text-credit",
                      isNegative && "text-debit",
                      r.type === "TRANSFER" && "text-accent"
                    )}
                  >
                    {isPositive ? "+" : isNegative ? "-" : ""}
                    {formatCurrency(Math.abs(r.amount))}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
