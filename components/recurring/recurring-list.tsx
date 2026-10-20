"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Repeat, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Amount } from "@/components/ui/amount";
import { Button } from "@/components/ui/button";
import { RecurringFormDialog, type RecurringFormValues } from "@/components/recurring/recurring-form-dialog";
import { FREQUENCY_LABELS } from "@/lib/validations/recurring";
import { DueRecurringPrompt } from "@/components/recurring/due-recurring-prompt";
import { formatDate } from "@/lib/dates";

export type RecurringRow = {
  id: string;
  type: "INCOME" | "EXPENSE";
  amount: number;
  description: string;
  accountName: string;
  categoryName: string;
  frequency: "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";
  nextRunDate: string;
  isDue: boolean;
  isActive: boolean;
  accountId: string;
  categoryId: string;
};

export function RecurringList({
  rules,
  accounts,
  incomeCategories,
  expenseCategories,
}: {
  rules: RecurringRow[];
  accounts: { id: string; name: string }[];
  incomeCategories: { id: string; name: string }[];
  expenseCategories: { id: string; name: string }[];
}) {
  if (rules.length === 0) {
    return <p className="text-sm text-ink-muted py-6">No recurring transactions set up yet.</p>;
  }

  return (
    <div className="border border-rule rounded-sm">
      <div className="divide-y divide-rule/60">
        {rules.map((r) => (
          <Row
            key={r.id}
            rule={r}
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
  rule,
  accounts,
  incomeCategories,
  expenseCategories,
}: {
  rule: RecurringRow;
  accounts: { id: string; name: string }[];
  incomeCategories: { id: string; name: string }[];
  expenseCategories: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [processing, setProcessing] = React.useState(false);

  async function handleDelete() {
    if (!confirm(`Delete the recurring rule "${rule.description || rule.categoryName}"?`)) return;
    setBusy(true);
    try {
      await fetch(`/api/recurring/${rule.id}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  const editValues: RecurringFormValues = {
    id: rule.id,
    type: rule.type,
    accountId: rule.accountId,
    categoryId: rule.categoryId,
    amount: rule.amount,
    description: rule.description,
    frequency: rule.frequency,
    isActive: rule.isActive,
  };

  return (
    <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3">
      <div className="flex items-center gap-3 min-w-0">
        <Repeat
          className={cn("size-4 shrink-0", rule.isActive ? "text-accent" : "text-ink-muted")}
          strokeWidth={1.75}
        />
        <div className="min-w-0">
          <p className="text-sm truncate">{rule.description || rule.categoryName}</p>
          <p className="text-xs text-ink-muted truncate">
            {rule.accountName} · {rule.categoryName} · {FREQUENCY_LABELS[rule.frequency]}
            {!rule.isActive && " · Paused"}
            {" · next "}
            {formatDate(rule.nextRunDate, { day: "numeric", month: "short" })}
            {rule.isDue && <span className="text-debit"> · Due</span>}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-4 shrink-0">
        <Amount
          value={rule.amount}
          prefix={rule.type === "INCOME" ? "+" : "-"}
          className={cn("ledger-amount text-sm", rule.type === "INCOME" ? "text-credit" : "text-debit")}
        />
        <div className="flex items-center gap-0.5 sm:gap-1">
          {rule.isDue && (
            <Button variant="outline" size="sm" disabled={busy} onClick={() => setProcessing(true)}>
              {rule.type === "INCOME" ? "Add now" : "Deduct now"}
            </Button>
          )}
          {processing && (
            <DueRecurringPrompt
              accounts={accounts}
              onClose={() => setProcessing(false)}
              due={{
                id: rule.id,
                label: rule.description || rule.categoryName,
                type: rule.type,
                amount: rule.amount,
                accountId: rule.accountId,
                dueDate: formatDate(rule.nextRunDate, {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                }),
              }}
            />
          )}
          <RecurringFormDialog
            mode="edit"
            rule={editValues}
            accounts={accounts}
            incomeCategories={incomeCategories}
            expenseCategories={expenseCategories}
          />
          <Button variant="ghost" size="icon" disabled={busy} onClick={handleDelete} aria-label="Delete rule">
            <Trash2 className="size-4 text-debit" strokeWidth={1.75} />
          </Button>
        </div>
      </div>
    </div>
  );
}
