import { PageHeader } from "@/components/page-header";
import { db } from "@/lib/db";
import { getCurrentUserId } from "@/lib/session";
import { ensureDefaultCategories } from "@/lib/categories";
import { fetchUnifiedLedger } from "@/lib/ledger-query";
import { TransactionFilters } from "@/components/transactions/transaction-filters";
import { TransactionFormDialog } from "@/components/transactions/transaction-form-dialog";
import { TransactionList } from "@/components/transactions/transaction-list";
import type { AccountRecord, CategoryRecord } from "@/lib/types";

// Balances and filtered results must always reflect the latest write.
export const dynamic = "force-dynamic";

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; accountId?: string; categoryId?: string; month?: string }>;
}) {
  const params = await searchParams;
  const userId = await getCurrentUserId();

  await ensureDefaultCategories(userId);

  const [accounts, categories]: [AccountRecord[], CategoryRecord[]] = await Promise.all([
    db.account.findMany({ where: { userId, isArchived: false }, orderBy: { createdAt: "asc" } }),
    db.category.findMany({ where: { userId }, orderBy: { name: "asc" } }),
  ]);

  // Merges regular Transaction rows with SavingTransaction rows (and
  // therefore recurring-generated transactions too, since those are
  // already real Transaction rows) — see lib/ledger-query.ts.
  const rows = await fetchUnifiedLedger(userId, {
    type: params.type,
    accountId: params.accountId,
    categoryId: params.categoryId,
    month: params.month,
  });

  const accountOptions = accounts.map((a) => ({ id: a.id, name: a.name }));
  const incomeCategories = categories.filter((c) => c.kind === "INCOME").map((c) => ({ id: c.id, name: c.name }));
  const expenseCategories = categories.filter((c) => c.kind === "EXPENSE").map((c) => ({ id: c.id, name: c.name }));

  return (
    <>
      <PageHeader
        eyebrow="Ledger entries"
        title="Transactions"
        action={
          <TransactionFormDialog
            mode="create"
            accounts={accountOptions}
            incomeCategories={incomeCategories}
            expenseCategories={expenseCategories}
          />
        }
      />
      <TransactionFilters accounts={accountOptions} />
      <TransactionList
        transactions={rows}
        accounts={accountOptions}
        incomeCategories={incomeCategories}
        expenseCategories={expenseCategories}
      />
    </>
  );
}
