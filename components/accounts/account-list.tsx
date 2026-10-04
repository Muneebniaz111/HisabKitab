"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Archive, ArchiveRestore, Trash2, Landmark, Smartphone, Wallet, CircleDollarSign } from "lucide-react";
import { cn } from "@/lib/utils";
import { Amount } from "@/components/ui/amount";
import { Button } from "@/components/ui/button";
import { AccountFormDialog } from "@/components/accounts/account-form-dialog";
import { ACCOUNT_TYPE_LABELS } from "@/lib/validations/account";

export type AccountRow = {
  id: string;
  name: string;
  type: "BANK" | "MOBILE_WALLET" | "CASH" | "OTHER";
  openingBalance: number;
  currentBalance: number;
  isArchived: boolean;
};

const TYPE_ICON = {
  BANK: Landmark,
  MOBILE_WALLET: Smartphone,
  CASH: Wallet,
  OTHER: CircleDollarSign,
} as const;

export function AccountList({ accounts }: { accounts: AccountRow[] }) {
  const active = accounts.filter((a) => !a.isArchived);
  const archived = accounts.filter((a) => a.isArchived);
  const totalBalance = active.reduce((sum, a) => sum + a.currentBalance, 0);

  return (
    <div className="px-4 sm:px-6 lg:px-10 py-6 sm:py-8 space-y-6 sm:space-y-8">
      <div className="border border-rule bg-surface rounded-sm px-6 sm:px-8 py-6 sm:py-7">
        <p className="text-xs uppercase tracking-[0.14em] text-ink-muted mb-2">Total Balance</p>
        <Amount value={totalBalance} className="ledger-amount font-display text-3xl sm:text-4xl" />
      </div>

      <div className="border border-rule rounded-sm">
        {active.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-ink-muted">
            No accounts yet. Add Meezan Bank, JazzCash, EasyPaisa, or Cash to get started.
          </p>
        ) : (
          <div className="divide-y divide-rule/60">
            {active.map((account) => (
              <AccountRowItem key={account.id} account={account} />
            ))}
          </div>
        )}
      </div>

      {archived.length > 0 && (
        <details className="group">
          <summary className="cursor-pointer text-xs uppercase tracking-[0.14em] text-ink-muted mb-3 select-none">
            Archived accounts ({archived.length})
          </summary>
          <div className="border border-rule rounded-sm opacity-70">
            <div className="divide-y divide-rule/60">
              {archived.map((account) => (
                <AccountRowItem key={account.id} account={account} />
              ))}
            </div>
          </div>
        </details>
      )}
    </div>
  );
}

function AccountRowItem({ account }: { account: AccountRow }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const Icon = TYPE_ICON[account.type];

  async function toggleArchive() {
    setBusy(true);
    try {
      await fetch(`/api/accounts/${account.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isArchived: !account.isArchived }),
      });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`Remove "${account.name}"? Accounts with transaction history are archived instead of deleted.`)) {
      return;
    }
    setBusy(true);
    try {
      await fetch(`/api/accounts/${account.id}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3.5">
      <div className="flex items-center gap-3 min-w-0">
        <Icon className="size-[18px] text-ink-muted shrink-0" strokeWidth={1.75} />
        <div className="min-w-0">
          <p className="text-sm truncate">{account.name}</p>
          <p className="text-xs text-ink-muted">{ACCOUNT_TYPE_LABELS[account.type]}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-4 shrink-0">
        <Amount
          value={account.currentBalance}
          className={cn(
            "ledger-amount text-sm",
            account.currentBalance < 0 ? "text-debit" : "text-ink"
          )}
        />

        <div className="flex items-center gap-0.5 sm:gap-1">
          <AccountFormDialog mode="edit" account={account} />
          <Button
            variant="ghost"
            size="icon"
            disabled={busy}
            onClick={toggleArchive}
            aria-label={account.isArchived ? "Restore account" : "Archive account"}
          >
            {account.isArchived ? (
              <ArchiveRestore className="size-4" strokeWidth={1.75} />
            ) : (
              <Archive className="size-4" strokeWidth={1.75} />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            disabled={busy}
            onClick={handleDelete}
            aria-label="Delete account"
          >
            <Trash2 className="size-4 text-debit" strokeWidth={1.75} />
          </Button>
        </div>
      </div>
    </div>
  );
}
