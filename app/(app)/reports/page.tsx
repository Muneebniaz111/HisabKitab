import { PageHeader } from "@/components/page-header";
import { db } from "@/lib/db";
import { getCurrentUserId } from "@/lib/session";
import { monthRange, recentMonths } from "@/lib/date-range";
import { categoryBreakdown } from "@/lib/calculations";
import { buildAccountStatement } from "@/lib/reports";
import { fetchUnifiedLedger } from "@/lib/ledger-query";
import { ReportNav } from "@/components/reports/report-nav";
import { MonthPicker, AccountPicker } from "@/components/reports/report-filters";
import { MonthlyLedger } from "@/components/reports/monthly-ledger";
import { CategoryBreakdownChart } from "@/components/reports/category-breakdown-chart";
import { TrendsChart, type MonthTrend } from "@/components/reports/trends-chart";
import { AccountStatement } from "@/components/reports/account-statement";
import type { AccountRecord, TransactionWithRelations } from "@/lib/types";

// Every report reads the latest data — never statically cached.
export const dynamic = "force-dynamic";

const TRANSACTION_INCLUDE = {
  account: { select: { id: true, name: true } },
  fromAccount: { select: { id: true, name: true } },
  toAccount: { select: { id: true, name: true } },
  category: { select: { id: true, name: true } },
} as const;

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; month?: string; accountId?: string }>;
}) {
  const params = await searchParams;
  const userId = await getCurrentUserId();
  const view = params.view ?? "ledger";

  const accounts: AccountRecord[] = await db.account.findMany({
    where: { userId, isArchived: false },
    orderBy: { createdAt: "asc" },
  });
  const accountOptions = accounts.map((a) => ({ id: a.id, name: a.name }));

  return (
    <>
      <PageHeader eyebrow="Hisab-Kitab" title="Reports" />

      <div className="flex flex-wrap items-center gap-4 px-4 sm:px-6 lg:px-10 py-4 border-b border-rule">
        <ReportNav view={view} />
        {(view === "ledger" || view === "categories") && (
          <MonthPicker month={monthRange(params.month).value} />
        )}
        {view === "categories" && accountOptions.length > 0 && (
          <AccountPicker accountId={params.accountId ?? "ALL"} accounts={accountOptions} allowAll />
        )}
        {view === "statement" && accountOptions.length > 0 && (
          <AccountPicker accountId={params.accountId ?? accountOptions[0].id} accounts={accountOptions} />
        )}
      </div>

      {view === "categories" ? (
        <CategoriesView userId={userId} month={params.month} accountId={params.accountId} />
      ) : view === "trends" ? (
        <TrendsView userId={userId} />
      ) : view === "statement" ? (
        <StatementView userId={userId} accountId={params.accountId} accounts={accounts} />
      ) : (
        <LedgerView userId={userId} month={params.month} />
      )}
    </>
  );
}

async function LedgerView({ userId, month }: { userId: string; month?: string }) {
  const { label, value } = monthRange(month);
  const rows = await fetchUnifiedLedger(userId, { month: value });
  return <MonthlyLedger monthLabel={label} rows={rows} />;
}

async function CategoriesView({
  userId,
  month,
  accountId,
}: {
  userId: string;
  month?: string;
  accountId?: string;
}) {
  const { start, end, label } = monthRange(month);

  const transactions: TransactionWithRelations[] = await db.transaction.findMany({
    where: {
      userId,
      date: { gte: start, lt: end },
      type: { in: ["INCOME", "EXPENSE"] },
      ...(accountId ? { accountId } : {}),
    },
    include: TRANSACTION_INCLUDE,
  });

  const forBreakdown = transactions.map((t) => ({
    categoryName: t.category?.name ?? null,
    amount: Number(t.amount),
    type: t.type,
  }));

  return (
    <CategoryBreakdownChart
      monthLabel={label}
      expenseData={categoryBreakdown(forBreakdown, "EXPENSE")}
      incomeData={categoryBreakdown(forBreakdown, "INCOME")}
    />
  );
}

async function TrendsView({ userId }: { userId: string }) {
  const months = recentMonths(6);

  const sums = await Promise.all(
    months.map((m) =>
      Promise.all([
        db.transaction.aggregate({
          where: { userId, type: "INCOME", date: { gte: m.start, lt: m.end } },
          _sum: { amount: true },
        }),
        db.transaction.aggregate({
          where: { userId, type: "EXPENSE", date: { gte: m.start, lt: m.end } },
          _sum: { amount: true },
        }),
      ])
    )
  );

  const data: MonthTrend[] = months.map((m, i) => {
    const [incomeAgg, expenseAgg]: [{ _sum: { amount: number | null } }, { _sum: { amount: number | null } }] =
      sums[i];
    return {
      label: m.start.toLocaleDateString("en-PK", { month: "short" }),
      income: Number(incomeAgg._sum.amount ?? 0),
      expenses: Number(expenseAgg._sum.amount ?? 0),
    };
  });

  return <TrendsChart data={data} />;
}

async function StatementView({
  userId,
  accountId,
  accounts,
}: {
  userId: string;
  accountId?: string;
  accounts: AccountRecord[];
}) {
  const account = accounts.find((a) => a.id === accountId) ?? accounts[0];

  if (!account) {
    return <p className="px-4 sm:px-6 lg:px-10 py-16 text-center text-sm text-ink-muted">Add an account to see a statement.</p>;
  }

  const rawTransactions: TransactionWithRelations[] = await db.transaction.findMany({
    where: {
      userId,
      OR: [{ accountId: account.id }, { fromAccountId: account.id }, { toAccountId: account.id }],
    },
    include: TRANSACTION_INCLUDE,
    orderBy: [{ date: "asc" }, { createdAt: "asc" }],
  });

  // buildAccountStatement() does real arithmetic (running += delta) on
  // these amounts. Prisma returns Decimal fields as Decimal objects, not
  // plain numbers — left unconverted, JS's `+`/`-` operators silently fall
  // back to string coercion on them instead of throwing, producing
  // garbled running balances rather than a visible error. Every other
  // view in this file converts before use; this is that same conversion.
  const transactions = rawTransactions.map((t) => ({ ...t, amount: Number(t.amount) }));
  const openingBalance = Number(account.openingBalance);

  const rows = buildAccountStatement(account.id, openingBalance, transactions);

  return <AccountStatement accountName={account.name} openingBalance={openingBalance} rows={rows} />;
}
