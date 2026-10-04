import { ArrowDownLeft, ArrowUpRight, ArrowLeftRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Amount } from "@/components/ui/amount";
import { CsvExportButton } from "@/components/reports/csv-export-button";
import type { StatementRow } from "@/lib/types";

export function AccountStatement({
  accountName,
  openingBalance,
  rows,
}: {
  accountName: string;
  openingBalance: number;
  rows: StatementRow[];
}) {
  const csvRows = [
    ["Opening Balance", "", "", "", openingBalance.toFixed(2)],
    ...rows.map((r) => [
      r.date.slice(0, 10),
      r.type,
      r.description,
      r.counterpart,
      r.delta.toFixed(2),
      r.runningBalance.toFixed(2),
    ]),
  ];

  return (
    <div className="mx-4 sm:mx-6 lg:mx-10 my-6 sm:my-8 border border-rule rounded-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-b border-rule">
        <p className="text-xs uppercase tracking-[0.14em] text-ink-muted">{accountName} · Statement</p>
        <CsvExportButton
          filename={`hisab-kitab-statement-${accountName.replace(/\s+/g, "-")}.csv`}
          headers={["Date", "Type", "Description", "Counterpart", "Amount", "Balance"]}
          rows={csvRows}
        />
      </div>

      <div className="flex items-center justify-between px-4 sm:px-6 py-2.5 bg-surface text-sm">
        <span className="text-ink-muted">Opening Balance</span>
        <Amount value={openingBalance} className="ledger-amount" />
      </div>

      {rows.length === 0 ? (
        <p className="px-6 py-10 text-center text-sm text-ink-muted">No transactions on this account yet.</p>
      ) : (
        <div className="divide-y divide-rule/60">
          {rows.map((r) => (
            <div key={r.id} className="flex items-center justify-between gap-3 px-4 sm:px-6 py-2.5">
              <div className="flex items-center gap-3 min-w-0">
                {r.type === "INCOME" || r.type === "TRANSFER_IN" ? (
                  <ArrowDownLeft className="size-4 text-credit shrink-0" strokeWidth={2} />
                ) : r.type === "EXPENSE" ? (
                  <ArrowUpRight className="size-4 text-debit shrink-0" strokeWidth={2} />
                ) : (
                  <ArrowLeftRight className="size-4 text-accent shrink-0" strokeWidth={2} />
                )}
                <div className="min-w-0">
                  <p className="text-sm truncate">{r.description || r.counterpart}</p>
                  <p className="text-xs text-ink-muted truncate">
                    {r.counterpart} ·{" "}
                    {new Date(r.date).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 sm:gap-4 shrink-0">
                <Amount
                  value={Math.abs(r.delta)}
                  prefix={r.delta >= 0 ? "+" : "-"}
                  className={cn("ledger-amount text-sm", r.delta >= 0 ? "text-credit" : "text-debit")}
                />
                <Amount
                  value={r.runningBalance}
                  className="ledger-amount text-sm text-ink-muted w-20 sm:w-28 text-right"
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
