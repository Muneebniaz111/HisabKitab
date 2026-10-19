// Mirrors the `TransactionType` enum in prisma/schema.prisma. Kept as a local
// literal type (rather than importing from "@prisma/client") so this module
// has no dependency on a generated client — it type-checks and is unit
// -testable even before `prisma generate` has been run.
export type TransactionType = "INCOME" | "EXPENSE" | "TRANSFER";

export type AccountDelta = { accountId: string; delta: number };

/**
 * Unified balance effect of a transaction, independent of whether it's a
 * fresh create, an edit (reverse the old effect, apply the new one), or a
 * delete (reverse only). Used by every transactions API route so the
 * balance math lives in exactly one place.
 */
export function transactionEffects(params: {
  type: TransactionType;
  amount: number;
  accountId?: string | null;
  fromAccountId?: string | null;
  toAccountId?: string | null;
}): AccountDelta[] {
  const { type, amount } = params;

  if (type === "TRANSFER") {
    if (!params.fromAccountId || !params.toAccountId) {
      throw new Error("Transfer requires fromAccountId and toAccountId");
    }
    return [
      { accountId: params.fromAccountId, delta: -amount },
      { accountId: params.toAccountId, delta: amount },
    ];
  }

  if (!params.accountId) throw new Error("Income/Expense requires accountId");
  return [{ accountId: params.accountId, delta: type === "INCOME" ? amount : -amount }];
}

export function negateDeltas(deltas: AccountDelta[]): AccountDelta[] {
  return deltas.map((d) => ({ ...d, delta: -d.delta }));
}

/** Percentage complete for a savings goal, clamped to [0, 100]. */
export function savingProgressPercent(currentAmount: number, targetAmount: number): number {
  if (targetAmount <= 0) return 0;
  return Math.min(100, Math.max(0, (currentAmount / targetAmount) * 100));
}

/** Groups INCOME or EXPENSE transactions by category, sorted by amount descending. */
export function categoryBreakdown(
  transactions: { categoryName: string | null; amount: number; type: TransactionType }[],
  type: "INCOME" | "EXPENSE"
): { category: string; amount: number; percent: number }[] {
  const byCategory = new Map<string, number>();
  let total = 0;

  for (const t of transactions) {
    if (t.type !== type) continue;
    const key = t.categoryName ?? "Uncategorized";
    const amt = Math.abs(t.amount);
    byCategory.set(key, (byCategory.get(key) ?? 0) + amt);
    total += amt;
  }

  return Array.from(byCategory.entries())
    .map(([category, amount]) => ({
      category,
      amount,
      percent: total > 0 ? Math.round((amount / total) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.amount - a.amount);
}
