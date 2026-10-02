import { db } from "@/lib/db";
import { buildTransactionWhere, type TransactionFilters } from "@/lib/transaction-query";
import type { TransactionWithRelations } from "@/lib/types";

export type LedgerRowType = "INCOME" | "EXPENSE" | "TRANSFER" | "SAVING";

export type LedgerRow = {
  id: string;
  type: LedgerRowType;
  amount: number; // signed for SAVING (see SavingTransactionRecord); unsigned magnitude otherwise
  date: string; // ISO
  description: string;
  notes: string;
  accountId?: string;
  accountName?: string;
  categoryId?: string; // for SAVING rows, this is the Saving goal's id
  categoryName?: string; // for SAVING rows, this is the Saving goal's name
  fromAccountId?: string;
  fromAccountName?: string;
  toAccountId?: string;
  toAccountName?: string;
};

type SavingTransactionWithRelations = {
  id: string;
  amount: number;
  date: Date;
  description: string | null;
  accountId: string;
  account: { name: string };
  saving: { id: string; name: string };
};

/**
 * Recurring transactions already show up correctly wherever this is used
 * — lib/recurring.ts materializes them as real Transaction rows, so
 * db.transaction.findMany() below picks them up with no special casing.
 * Savings allocations don't: they live in the separate SavingTransaction
 * table (see prisma/schema.prisma), so without this merge they'd never
 * appear in the Transactions list or Monthly Ledger at all. This is a
 * read-side merge only — it doesn't touch how Savings are stored or how
 * their balances are calculated.
 */
export async function fetchUnifiedLedger(userId: string, filters: TransactionFilters): Promise<LedgerRow[]> {
  const wantsSavingsOnly = filters.type === "SAVING";
  const wantsSpecificRegularType = filters.type != null && filters.type !== "SAVING";

  let transactionRows: LedgerRow[] = [];
  if (!wantsSavingsOnly) {
    const rawTransactions = await db.transaction.findMany({
      where: buildTransactionWhere(userId, filters),
      include: {
        account: { select: { id: true, name: true } },
        fromAccount: { select: { id: true, name: true } },
        toAccount: { select: { id: true, name: true } },
        category: { select: { id: true, name: true } },
      },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      take: 200,
    });
    const transactions: TransactionWithRelations[] = rawTransactions.map((t) => ({
      ...t,
      amount: t.amount.toNumber(),
    }));

    transactionRows = transactions.map((t) => ({
      id: t.id,
      type: t.type as LedgerRowType,
      amount: Number(t.amount),
      date: t.date.toISOString(),
      description: t.description ?? "",
      notes: t.notes ?? "",
      accountId: t.accountId ?? undefined,
      accountName: t.account?.name,
      categoryId: t.categoryId ?? undefined,
      categoryName: t.category?.name,
      fromAccountId: t.fromAccountId ?? undefined,
      fromAccountName: t.fromAccount?.name,
      toAccountId: t.toAccountId ?? undefined,
      toAccountName: t.toAccount?.name,
    }));
  }

  const savingWhere: Record<string, unknown> = { saving: { userId } };
  if (filters.accountId) savingWhere.accountId = filters.accountId;
  if (filters.month && /^\d{4}-\d{2}$/.test(filters.month)) {
    const start = new Date(`${filters.month}-01T00:00:00.000Z`);
    const end = new Date(start);
    end.setUTCMonth(end.getUTCMonth() + 1);
    savingWhere.date = { gte: start, lt: end };
  }

  let savingRows: LedgerRow[] = [];
  if (!wantsSpecificRegularType) {
    const rawSavingTransactions = await db.savingTransaction.findMany({
      where: savingWhere,
      include: {
        account: { select: { id: true, name: true } },
        saving: { select: { id: true, name: true } },
      },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      take: 200,
    });
    const savingTransactions: SavingTransactionWithRelations[] = rawSavingTransactions.map((s) => ({
      ...s,
      amount: s.amount.toNumber(),
    }));

    savingRows = savingTransactions.map((s) => {
      const amount = Number(s.amount);
      return {
        id: s.id,
        type: "SAVING" as const,
        amount,
        date: s.date.toISOString(),
        description: s.description || (amount >= 0 ? `Added to ${s.saving.name}` : `Withdrawn from ${s.saving.name}`),
        notes: "",
        accountId: s.accountId,
        accountName: s.account.name,
        categoryId: s.saving.id,
        categoryName: s.saving.name,
      };
    });
  }

  return [...transactionRows, ...savingRows]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 200);
}
