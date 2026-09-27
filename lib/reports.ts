import { transactionEffects } from "@/lib/calculations";
import type { TransactionWithRelations, StatementRow } from "@/lib/types";

/**
 * Replays a chronologically-sorted list of transactions through the same
 * transactionEffects() math Phase 3 uses for live balance updates, so the
 * statement's running balance is guaranteed to agree with the account's
 * actual currentBalance by the time it reaches the most recent row.
 */
export function buildAccountStatement(
  accountId: string,
  openingBalance: number,
  transactionsAscending: TransactionWithRelations[]
): StatementRow[] {
  let running = openingBalance;
  const rows: StatementRow[] = [];

  for (const t of transactionsAscending) {
    const effects = transactionEffects({
      type: t.type,
      amount: t.amount,
      accountId: t.accountId,
      fromAccountId: t.fromAccountId,
      toAccountId: t.toAccountId,
    });
    const delta = effects.find((e) => e.accountId === accountId)?.delta ?? 0;
    running += delta;

    let rowType: StatementRow["type"];
    let counterpart: string;

    if (t.type === "TRANSFER") {
      const isOutgoing = t.fromAccountId === accountId;
      rowType = isOutgoing ? "TRANSFER_OUT" : "TRANSFER_IN";
      counterpart = isOutgoing ? t.toAccount?.name ?? "" : t.fromAccount?.name ?? "";
    } else {
      rowType = t.type;
      counterpart = t.category?.name ?? "Uncategorized";
    }

    rows.push({
      id: t.id,
      date: t.date.toISOString(),
      type: rowType,
      description: t.description ?? "",
      counterpart,
      delta,
      runningBalance: running,
    });
  }

  return rows;
}
