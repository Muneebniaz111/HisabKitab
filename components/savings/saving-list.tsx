"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Trash2, Target } from "lucide-react";
import { cn } from "@/lib/utils";
import { Amount } from "@/components/ui/amount";
import { Button } from "@/components/ui/button";
import { savingProgressPercent } from "@/lib/calculations";
import { SavingFormDialog } from "@/components/savings/saving-form-dialog";
import { SavingAllocateDialog } from "@/components/savings/saving-allocate-dialog";

export type SavingCardData = {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string | null; // "YYYY-MM-DD"
  status: "ACTIVE" | "COMPLETED" | "CANCELLED";
  recentAllocations: { id: string; amount: number; date: string; description: string; accountName: string }[];
};

const STATUS_STYLE: Record<SavingCardData["status"], string> = {
  ACTIVE: "text-accent bg-accent-surface",
  COMPLETED: "text-credit bg-credit-surface",
  CANCELLED: "text-ink-muted bg-surface",
};

export function SavingList({
  savings,
  accounts,
}: {
  savings: SavingCardData[];
  accounts: { id: string; name: string }[];
}) {
  if (savings.length === 0) {
    return (
      <p className="px-4 sm:px-6 lg:px-10 py-16 text-center text-sm text-ink-muted">
        No savings goals yet. Add one to start setting money aside.
      </p>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-10 py-6 sm:py-8 grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6">
      {savings.map((s) => (
        <SavingCard key={s.id} saving={s} accounts={accounts} />
      ))}
    </div>
  );
}

function SavingCard({ saving, accounts }: { saving: SavingCardData; accounts: { id: string; name: string }[] }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const percent = savingProgressPercent(saving.currentAmount, saving.targetAmount);

  async function handleDelete() {
    if (!confirm(`Delete "${saving.name}"?`)) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/savings/${saving.id}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        alert(body?.error ?? "Couldn't delete this goal.");
        return;
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="border border-rule rounded-sm p-6 flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <Target className="size-[18px] text-ink-muted shrink-0" strokeWidth={1.75} />
          <div className="min-w-0">
            <p className="text-sm truncate">{saving.name}</p>
            {saving.targetDate && (
              <p className="text-xs text-ink-muted">
                by{" "}
                {new Date(saving.targetDate).toLocaleDateString("en-PK", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </p>
            )}
          </div>
        </div>
        <span className={cn("text-[11px] px-2 py-0.5 rounded-sm shrink-0", STATUS_STYLE[saving.status])}>
          {saving.status}
        </span>
      </div>

      <div>
        <div className="flex items-baseline justify-between mb-1.5">
          <Amount value={saving.currentAmount} className="ledger-amount text-lg" />
          <span className="inline-flex min-w-0 items-center gap-1 text-xs text-ink-muted">
            <span>of</span>
            <Amount value={saving.targetAmount} className="ledger-amount text-xs text-ink-muted" />
          </span>
        </div>
        <div className="h-2 rounded-full bg-surface overflow-hidden">
          <div className="h-full bg-accent rounded-full transition-all" style={{ width: `${percent}%` }} />
        </div>
      </div>

      {saving.recentAllocations.length > 0 && (
        <div className="text-xs text-ink-muted space-y-1">
          {saving.recentAllocations.map((a) => (
            <div key={a.id} className="flex items-center justify-between">
              <span className="truncate">
                {a.description || (a.amount >= 0 ? "Added from" : "Withdrawn to")} {a.accountName}
              </span>
              <Amount
                value={Math.abs(a.amount)}
                prefix={a.amount >= 0 ? "+" : "-"}
                className={cn("ledger-amount shrink-0 ml-2", a.amount >= 0 ? "text-credit" : "text-debit")}
              />
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between pt-2 border-t border-rule">
        <SavingAllocateDialog savingId={saving.id} savingName={saving.name} accounts={accounts} />
        <div className="flex items-center gap-1">
          <SavingFormDialog
            mode="edit"
            saving={{
              id: saving.id,
              name: saving.name,
              targetAmount: saving.targetAmount,
              targetDate: saving.targetDate,
              status: saving.status,
            }}
          />
          <Button variant="ghost" size="icon" disabled={busy} onClick={handleDelete} aria-label="Delete goal">
            <Trash2 className="size-4 text-debit" strokeWidth={1.75} />
          </Button>
        </div>
      </div>
    </div>
  );
}
