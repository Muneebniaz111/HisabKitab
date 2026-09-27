export type TransactionFilters = {
  type?: string | null;
  accountId?: string | null;
  categoryId?: string | null;
  month?: string | null; // "YYYY-MM"
};

export function buildTransactionWhere(userId: string, filters: TransactionFilters) {
  const where: Record<string, unknown> = { userId };

  if (filters.type) where.type = filters.type;
  if (filters.categoryId) where.categoryId = filters.categoryId;

  if (filters.accountId) {
    // An account can be the primary account (income/expense) or either
    // leg of a transfer — match any of the three.
    where.OR = [
      { accountId: filters.accountId },
      { fromAccountId: filters.accountId },
      { toAccountId: filters.accountId },
    ];
  }

  if (filters.month && /^\d{4}-\d{2}$/.test(filters.month)) {
    const start = new Date(`${filters.month}-01T00:00:00.000Z`);
    const end = new Date(start);
    end.setUTCMonth(end.getUTCMonth() + 1);
    where.date = { gte: start, lt: end };
  }

  return where;
}
