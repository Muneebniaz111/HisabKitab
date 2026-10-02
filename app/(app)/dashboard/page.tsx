import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { ArrowDownLeft, ArrowUpRight, ArrowLeftRight, Plus } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { db } from "@/lib/db";
import { getCurrentUserId } from "@/lib/session";
import { monthRange } from "@/lib/date-range";
import { processDueRecurringTransactions } from "@/lib/recurring";
import { sendSavingsReminderIfDue, sendUpcomingRecurringReminders } from "@/lib/email/notify";
import { after } from "next/server";
import { ACCOUNT_TYPE_LABELS } from "@/lib/validations/account";
import type { AccountRecord, TransactionWithRelations } from "@/lib/types";

// Balances must always reflect the latest write — never statically cached.
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const userId = await getCurrentUserId();

  // Lazy catch-up: materializes any recurring transactions that came due
  // since the last visit, so the balances rendered below are correct —
  // this one has to be awaited before we fetch the rest of the page's
  // data. The reminder emails don't affect anything rendered here, so
  // they're deferred with after() instead of adding network latency to
  // every dashboard load; Vercel Cron (see vercel.json) also runs all
  // three daily in production. Both reminder functions are internally
  // guarded (reminderSentAt / lastSavingsReminderAt), so running them on
  // every dashboard load never sends duplicates.
  await processDueRecurringTransactions(userId);
  after(async () => {
    await sendUpcomingRecurringReminders(userId);
    await sendSavingsReminderIfDue(userId);
  });

  const { start: monthStart, end: monthEnd, label: monthLabel } = monthRange();

  const accounts: AccountRecord[] = await db.account.findMany({
    where: { userId, isArchived: false },
    orderBy: { createdAt: "asc" },
  });

  const [incomeAgg, expenseAgg, savingsAgg, recentTransactions]: [
    { _sum: { amount: number | null } },
    { _sum: { amount: number | null } },
    { _sum: { amount: number | null } },
    TransactionWithRelations[],
  ] = await Promise.all([
    db.transaction.aggregate({
      where: { userId, type: "INCOME", date: { gte: monthStart, lt: monthEnd } },
      _sum: { amount: true },
    }),
    db.transaction.aggregate({
      where: { userId, type: "EXPENSE", date: { gte: monthStart, lt: monthEnd } },
      _sum: { amount: true },
    }),
    db.savingTransaction.aggregate({
      where: { saving: { userId }, date: { gte: monthStart, lt: monthEnd } },
      _sum: { amount: true },
    }),
    db.transaction.findMany({
      where: { userId },
      include: {
        account: { select: { id: true, name: true } },
        fromAccount: { select: { id: true, name: true } },
        toAccount: { select: { id: true, name: true } },
        category: { select: { id: true, name: true } },
      },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      take: 5,
    }),
  ]);

  const totalBalance = accounts.reduce((sum, a) => sum + Number(a.currentBalance), 0);
  const totalIncome = Number(incomeAgg._sum.amount ?? 0);
  const totalExpenses = Number(expenseAgg._sum.amount ?? 0);
  // Net of allocations minus withdrawals this month — matches the monthly
  // framing of Income/Expenses above. See lib/types.ts:SavingTransactionRecord
  // for why the signed amount alone is enough to compute this.
  const netSavings = Number(savingsAgg._sum.amount ?? 0);

  return (
    <>
      <PageHeader
        eyebrow={monthLabel}
        title="Dashboard"
        action={
          <Link
            href="/transactions"
            className="flex items-center gap-2 bg-accent text-paper text-sm px-4 py-2.5 rounded-sm hover:bg-[#463b95] transition-colors"
          >
            <Plus className="size-4" strokeWidth={2} />
            Add Transaction
          </Link>
        }
      />

      <div className="px-4 sm:px-6 lg:px-10 py-6 sm:py-8 space-y-6 sm:space-y-8">
        <div className="border border-rule bg-surface rounded-sm px-6 sm:px-8 py-6 sm:py-7">
          <p className="text-xs uppercase tracking-[0.14em] text-ink-muted mb-2">Total Balance</p>
          <p className="ledger-amount font-display text-3xl sm:text-4xl">{formatCurrency(totalBalance)}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Stat label="Income (this month)" value={totalIncome} tone="credit" />
          <Stat label="Expenses (this month)" value={-totalExpenses} tone="debit" />
          <Stat label="Savings (this month)" value={netSavings} tone="accent" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-2 border border-rule rounded-sm">
            <p className="text-xs uppercase tracking-[0.14em] text-ink-muted px-6 pt-5 pb-3">
              Accounts
            </p>
            {accounts.length === 0 ? (
              <p className="px-6 pb-5 text-sm text-ink-muted">
                No accounts yet.{" "}
                <Link href="/accounts" className="text-accent hover:underline">
                  Add one
                </Link>
                .
              </p>
            ) : (
              <div className="divide-y divide-rule/60">
                {accounts.map((a) => (
                  <div key={a.id} className="flex items-center justify-between px-6 py-2.5">
                    <div>
                      <span className="text-sm block">{a.name}</span>
                      <span className="text-xs text-ink-muted">{ACCOUNT_TYPE_LABELS[a.type]}</span>
                    </div>
                    <span className="ledger-amount text-sm">
                      {formatCurrency(Number(a.currentBalance))}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="lg:col-span-3 border border-rule rounded-sm">
            <div className="flex items-center justify-between px-6 pt-5 pb-3">
              <p className="text-xs uppercase tracking-[0.14em] text-ink-muted">
                Recent Transactions
              </p>
              <Link href="/transactions" className="text-xs text-accent hover:underline">
                View all
              </Link>
            </div>
            {recentTransactions.length === 0 ? (
              <p className="px-6 pb-5 text-sm text-ink-muted">
                No transactions yet.{" "}
                <Link href="/transactions" className="text-accent hover:underline">
                  Add one
                </Link>
                .
              </p>
            ) : (
              <div className="divide-y divide-rule/60">
                {recentTransactions.map((t) => (
                  <div key={t.id} className="flex items-center justify-between px-6 py-2.5">
                    <div className="flex items-center gap-3 min-w-0">
                      {t.type === "INCOME" ? (
                        <ArrowDownLeft className="size-4 text-credit shrink-0" strokeWidth={2} />
                      ) : t.type === "EXPENSE" ? (
                        <ArrowUpRight className="size-4 text-debit shrink-0" strokeWidth={2} />
                      ) : (
                        <ArrowLeftRight className="size-4 text-accent shrink-0" strokeWidth={2} />
                      )}
                      <div className="min-w-0">
                        <p className="text-sm truncate">
                          {t.description || (t.type === "TRANSFER" ? "Transfer" : t.category?.name)}
                        </p>
                        <p className="text-xs text-ink-muted truncate">
                          {t.type === "TRANSFER"
                            ? `${t.fromAccount?.name} → ${t.toAccount?.name}`
                            : `${t.account?.name} · ${t.category?.name}`}
                        </p>
                      </div>
                    </div>
                    <span
                      className={cn(
                        "ledger-amount text-sm shrink-0",
                        t.type === "INCOME" && "text-credit",
                        t.type === "EXPENSE" && "text-debit",
                        t.type === "TRANSFER" && "text-accent"
                      )}
                    >
                      {t.type === "INCOME" ? "+" : t.type === "EXPENSE" ? "-" : ""}
                      {formatCurrency(Number(t.amount))}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

const TONE_CLASS = {
  credit: "text-credit",
  debit: "text-debit",
  accent: "text-accent",
} as const;

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: keyof typeof TONE_CLASS;
}) {
  return (
    <div className="border border-rule rounded-sm bg-surface px-5 py-4 sm:px-6 sm:py-5">
      <p className="text-xs uppercase tracking-[0.14em] text-ink-muted mb-2">{label}</p>
      <p className={cn("ledger-amount text-xl", TONE_CLASS[tone])}>
        {value < 0 ? "-" : "+"}
        {formatCurrency(Math.abs(value))}
      </p>
    </div>
  );
}
