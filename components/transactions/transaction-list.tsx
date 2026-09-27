"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowDownLeft, ArrowUpRight, ArrowLeftRight, PiggyBank, Trash2 } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { TransactionFormDialog, type Option, type TransactionFormValues } from "@/components/transactions/transaction-form-dialog";
import type { LedgerRowType } from "@/lib/ledger-query";

export type TransactionRow = {
  id: string;
  type: LedgerRowType;
  amount: number; // signed for SAVING rows, unsigned magnitude otherwise
  date: string; // ISO
  description: string;
  notes: string;
  accountId?: string;
  accountName?: string;
  categoryId?: string;
  categoryName?: string;
  fromAccountId?: string;
  fromAccountName?: string;
  toAccountId?: string;
  toAccountName?: string;
};

export function TransactionList({
  transactions,
  accounts,
  incomeCategories,
  expenseCategories,
}: {
  transactions: TransactionRow[];
  accounts: Option[];
  incomeCategories: Option[];
  expenseCategories: Option[];
}) {
  if (transactions.length === 0) {
    return (
      <p className="px-4 sm:px-6 lg:px-10 py-16 text-center text-sm text-ink-muted">
        No transactions match these filters yet.
      </p>
    );
  }

  return (
    <div className="mx-4 sm:mx-6 lg:mx-10 my-6 border border-rule rounded-sm">
      <div className="divide-y divide-rule/60">
        {transactions.map((t) => (
          <Row
            key={t.id}
            t={t}
            accounts={accounts}
            incomeCategories={incomeCategories}
            expenseCategories={expenseCategories}
          />
        ))}
      </div>
    </div>
  );
}

function Row({
  t,
  accounts,
  incomeCategories,
  expenseCategories,
}: {
  t: TransactionRow;
  accounts: Option[];
  incomeCategories: Option[];
  expenseCategories: Option[];
}) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);

  // Savings allocations aren't Transaction rows — they're managed from
  // the Savings page (Add/Withdraw Funds), not editable/deletable here.
  // This row is a read-only view onto them so the ledger shows a complete
  // picture without duplicating that CRUD surface.
  if (t.type === "SAVING") {
    const isWithdrawal = t.amount < 0;
    return (
      <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3">
        <div className="flex items-center gap-3 min-w-0">
          <PiggyBank className="size-4 text-accent shrink-0" strokeWidth={2} />
          <div className="min-w-0">
            <p className="text-sm truncate">{t.description || t.categoryName}</p>
            <p className="text-xs text-ink-muted truncate">
              {isWithdrawal ? "Withdrawal" : "Deposit"} · {t.categoryName} · {t.accountName}
              {" · "}
              {new Date(t.date).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
          <span className={cn("ledger-amount text-sm", isWithdrawal ? "text-credit" : "text-debit")}>
            {isWithdrawal ? "+" : "-"}
            {formatCurrency(Math.abs(t.amount))}
          </span>
          <Link href="/savings" className="text-xs text-accent hover:underline hidden sm:inline">
            View goal
          </Link>
        </div>
      </div>
    );
  }

  async function handleDelete() {
    if (!confirm("Delete this transaction? Its effect on account balances will be reversed.")) return;
    setBusy(true);
    try {
      await fetch(`/api/transactions/${t.id}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  const editValues: TransactionFormValues = {
    id: t.id,
    type: t.type as "INCOME" | "EXPENSE" | "TRANSFER",
    amount: t.amount,
    date: t.date.slice(0, 10),
    description: t.description,
    notes: t.notes,
    accountId: t.accountId,
    categoryId: t.categoryId,
    fromAccountId: t.fromAccountId,
    toAccountId: t.toAccountId,
  };

  return (
    <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3">
      <div className="flex items-center gap-3 min-w-0">
        <TypeIcon type={t.type} />
        <div className="min-w-0">
          <p className="text-sm truncate">
            {t.description || (t.type === "TRANSFER" ? "Transfer" : t.categoryName)}
          </p>
          <p className="text-xs text-ink-muted truncate">
            {t.type === "TRANSFER"
              ? `${t.fromAccountName} → ${t.toAccountName}`
              : `${t.accountName} · ${t.categoryName}`}
            {" · "}
            {new Date(t.date).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" })}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-4 shrink-0">
        <span
          className={cn(
            "ledger-amount text-sm",
            t.type === "INCOME" && "text-credit",
            t.type === "EXPENSE" && "text-debit",
            t.type === "TRANSFER" && "text-accent"
          )}
        >
          {t.type === "INCOME" ? "+" : t.type === "EXPENSE" ? "-" : ""}
          {formatCurrency(t.amount)}
        </span>

        <div className="flex items-center gap-0.5 sm:gap-1">
          <TransactionFormDialog
            mode="edit"
            transaction={editValues}
            accounts={accounts}
            incomeCategories={incomeCategories}
            expenseCategories={expenseCategories}
          />
          <Button variant="ghost" size="icon" disabled={busy} onClick={handleDelete} aria-label="Delete transaction">
            <Trash2 className="size-4 text-debit" strokeWidth={1.75} />
          </Button>
        </div>
      </div>
    </div>
  );
}

function TypeIcon({ type }: { type: TransactionRow["type"] }) {
  if (type === "INCOME") return <ArrowDownLeft className="size-4 text-credit shrink-0" strokeWidth={2} />;
  if (type === "EXPENSE") return <ArrowUpRight className="size-4 text-debit shrink-0" strokeWidth={2} />;
  return <ArrowLeftRight className="size-4 text-accent shrink-0" strokeWidth={2} />;
}
