import { db } from "@/lib/db";
import { transactionEffects } from "@/lib/calculations";
import type { RecurrenceFrequency, RecurringTransactionRecord } from "@/lib/types";

/**
 * The next occurrence after `current`. MONTHLY clamps to the last day of
 * the target month when dayOfMonth doesn't exist there (e.g. a rule set
 * for the 31st still runs on Feb 28th) rather than skipping or overflowing
 * into the following month.
 */
export function computeNextRunDate(current: Date, frequency: RecurrenceFrequency, dayOfMonth?: number | null): Date {
  const year = current.getUTCFullYear();
  const month = current.getUTCMonth();
  const day = current.getUTCDate();

  switch (frequency) {
    case "DAILY":
      return new Date(Date.UTC(year, month, day + 1));
    case "WEEKLY":
      return new Date(Date.UTC(year, month, day + 7));
    case "YEARLY":
      return new Date(Date.UTC(year + 1, month, day));
    case "MONTHLY": {
      const targetDay = dayOfMonth ?? day;
      const daysInNextMonth = new Date(Date.UTC(year, month + 2, 0)).getUTCDate();
      return new Date(Date.UTC(year, month + 1, Math.min(targetDay, daysInNextMonth)));
    }
  }
}

// Guards against a misconfigured rule (e.g. nextRunDate stuck in the past
// due to a bad edit) generating unbounded history in one pass.
const MAX_CATCHUP_OCCURRENCES = 366;

/**
 * Materializes every due occurrence of every active recurring rule for a
 * user into real Transaction rows, advancing each rule's nextRunDate past
 * `now`. Each rule's catch-up (transactions + balance updates + the rule's
 * own nextRunDate) commits as one db.$transaction — a partially-applied
 * catch-up can't happen. Safe to call repeatedly; it's a no-op when
 * nothing is due. Returns the number of transactions created.
 */
export async function processDueRecurringTransactions(userId: string, now: Date = new Date()): Promise<number> {
  const dueRules: RecurringTransactionRecord[] = (await db.recurringTransaction.findMany({
    where: { userId, isActive: true, nextRunDate: { lte: now } },
  }))
    .filter((rule) => rule.type !== "TRANSFER")
    .map((rule) => ({
      ...rule,
      amount: rule.amount.toNumber(),
      type: rule.type as RecurringTransactionRecord["type"],
    }));

  let totalCreated = 0;

  for (const rule of dueRules) {
    const ops = [];
    const deltaByAccount = new Map<string, number>();

    let occurrenceDate = new Date(rule.nextRunDate);
    let iterations = 0;

    while (occurrenceDate <= now && iterations < MAX_CATCHUP_OCCURRENCES) {
      ops.push(
        db.transaction.create({
          data: {
            userId,
            type: rule.type,
            amount: rule.amount,
            date: occurrenceDate,
            description: rule.description,
            accountId: rule.accountId,
            categoryId: rule.categoryId,
            recurringId: rule.id,
          },
        })
      );

      const [effect] = transactionEffects({
        type: rule.type,
        amount: Number(rule.amount),
        accountId: rule.accountId,
      });
      deltaByAccount.set(effect.accountId, (deltaByAccount.get(effect.accountId) ?? 0) + effect.delta);

      occurrenceDate = computeNextRunDate(occurrenceDate, rule.frequency, rule.dayOfMonth);
      iterations++;
      totalCreated++;
    }

    if (iterations === 0) continue;

    for (const [accountId, delta] of deltaByAccount) {
      ops.push(db.account.update({ where: { id: accountId }, data: { currentBalance: { increment: delta } } }));
    }
    ops.push(
      db.recurringTransaction.update({
        where: { id: rule.id },
        // Resetting reminderSentAt here — not a separate step — re-arms
        // the "due in 2 days" guard in sendUpcomingRecurringReminders()
        // for whatever cycle nextRunDate now points at.
        data: { nextRunDate: occurrenceDate, reminderSentAt: null },
      })
    );

    await db.$transaction(ops);
  }

  return totalCreated;
}
