import type { Prisma } from "@prisma/client";

// The client passed to db.$transaction(async (tx) => ...) callbacks.
export type PrismaTx = Prisma.TransactionClient;

export class InsufficientFundsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InsufficientFundsError";
  }
}

/**
 * Atomically decrements an account's balance, but only if doing so
 * wouldn't take it below zero.
 *
 * This is NOT "read the balance, check it in JS, then write" — that
 * pattern has a race window where two concurrent requests can both pass
 * the check before either commits, overdrawing the account. Instead the
 * check and the decrement are the SAME Postgres statement: `UPDATE
 * accounts SET current_balance = current_balance - amount WHERE id = ?
 * AND current_balance >= amount`. Postgres evaluates the WHERE clause and
 * applies the write atomically, so there's no window for a second
 * request to interleave. If the row doesn't match (balance too low),
 * `updateMany` reports zero rows affected and we throw — which rolls
 * back the enclosing db.$transaction, so nothing partially applies.
 *
 * Must be called with the `tx` client from inside a db.$transaction
 * callback, not the top-level `db` client.
 */
export async function decrementBalanceOrThrow(
  tx: PrismaTx,
  accountId: string,
  accountName: string,
  amount: number
): Promise<void> {
  const result = await tx.account.updateMany({
    where: { id: accountId, currentBalance: { gte: amount } },
    data: { currentBalance: { decrement: amount } },
  });

  if (result.count === 0) {
    const account = await tx.account.findUnique({ where: { id: accountId } });
    const available = account ? Number(account.currentBalance) : 0;
    throw new InsufficientFundsError(
      `Insufficient funds in ${accountName}. Available: Rs. ${available.toLocaleString("en-PK")}, required: Rs. ${amount.toLocaleString("en-PK")}.`
    );
  }
}

/** Same atomic guard, for Saving.currentAmount — used by withdrawals. */
export async function decrementSavingOrThrow(
  tx: PrismaTx,
  savingId: string,
  savingName: string,
  amount: number
): Promise<void> {
  const result = await tx.saving.updateMany({
    where: { id: savingId, currentAmount: { gte: amount } },
    data: { currentAmount: { decrement: amount } },
  });

  if (result.count === 0) {
    const saving = await tx.saving.findUnique({ where: { id: savingId } });
    const available = saving ? Number(saving.currentAmount) : 0;
    throw new InsufficientFundsError(
      `Only Rs. ${available.toLocaleString("en-PK")} is available to withdraw from "${savingName}".`
    );
  }
}
