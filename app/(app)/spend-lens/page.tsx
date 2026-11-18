import { PageHeader } from "@/components/page-header";
import { db } from "@/lib/db";
import { getCurrentUserId } from "@/lib/session";
import { getAccounts } from "@/lib/accounts";
import { monthRange } from "@/lib/date-range";
import { sumMoney } from "@/lib/money";
import { MonthPicker, AccountPicker } from "@/components/reports/report-filters";
import { SpendLens, type LensCategory } from "@/components/spend-lens/spend-lens";

// Totals and lists must always reflect the latest write.
export const dynamic = "force-dynamic";

export default async function SpendLensPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; accountId?: string }>;
}) {
  const params = await searchParams;
  const userId = await getCurrentUserId();
  const { start, end, label, value } = monthRange(params.month);

  const [accounts, transactions] = await Promise.all([
    getAccounts(userId),
    db.transaction.findMany({
      where: {
        userId,
        date: { gte: start, lt: end },
        type: { in: ["INCOME", "EXPENSE"] },
        ...(params.accountId ? { accountId: params.accountId } : {}),
      },
      include: {
        account: { select: { name: true } },
        category: { select: { id: true, name: true } },
      },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    }),
  ]);

  // One group per (type, category), keeping the newest-first order within it.
  const groups = new Map<string, LensCategory>();
  for (const t of transactions) {
    const type = t.type as "INCOME" | "EXPENSE";
    const key = `${type}:${t.category?.id ?? "none"}`;
    let group = groups.get(key);
    if (!group) {
      group = { key, type, name: t.category?.name ?? "Uncategorized", total: 0, transactions: [] };
      groups.set(key, group);
    }
    const amount = t.amount.toNumber();
    group.total = sumMoney([group.total, amount]);
    group.transactions.push({
      id: t.id,
      date: t.date.toISOString(),
      description: t.description ?? "",
      notes: t.notes ?? "",
      accountName: t.account?.name ?? "",
      amount,
    });
  }

  const categories = Array.from(groups.values()).sort((a, b) => b.total - a.total);
  const accountOptions = accounts.map((a) => ({ id: a.id, name: a.name }));

  return (
    <>
      <PageHeader eyebrow="Where the money went" title="Spend Lens" />

      <div className="flex flex-wrap items-center gap-4 px-4 sm:px-6 lg:px-10 py-4 border-b border-rule">
        <MonthPicker month={value} />
        {accountOptions.length > 0 && (
          <AccountPicker accountId={params.accountId ?? "ALL"} accounts={accountOptions} allowAll />
        )}
      </div>

      {/* Keyed by the filters so an open category closes when they change. */}
      <SpendLens key={`${value}:${params.accountId ?? "ALL"}`} monthLabel={label} categories={categories} />
    </>
  );
}
