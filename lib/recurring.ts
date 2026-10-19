import { db } from "@/lib/db";
import { transactionEffects } from "@/lib/calculations";
import type { RecurrenceFrequency } from "@/lib/types";

/**
 * The next occurrence after `current`. MONTHLY clamps to the last day of
 * the target month when dayOfMonth doesn't exist there (e.g. a rule set
 * for the 31st still runs on Feb 28th) rather than skipping or overflowing
 * into the following month.
 */
function computeNextRunDate(current: Date, frequency: RecurrenceFrequency, dayOfMonth?: number | null): Date {
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

/**
 * First run of a new rule: MONTHLY rules land on dayOfMonth (clamped to the
 * month's length) on or after `start`, so "day 25, starting today" first runs
 * on the 25th rather than today.
 */
export function firstRunDate(start: Date, frequency: RecurrenceFrequency, dayOfMonth?: number | null): Date {
  if (frequency !== "MONTHLY" || !dayOfMonth) return start;
  const year = start.getUTCFullYear();
  const month = start.getUTCMonth();
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const candidate = new Date(Date.UTC(year, month, Math.min(dayOfMonth, daysInMonth)));
  return candidate >= start ? candidate : computeNextRunDate(candidate, frequency, dayOfMonth);
}

/** Active rules whose current occurrence is due and hasn't been answered "No" in the popup. */
export async function findUnpromptedDueRules(userId: string, now: Date = new Date()) {
  const rules = await db.recurringTransaction.findMany({
    where: { userId, isActive: true, type: { not: "TRANSFER" }, nextRunDate: { lte: now } },
    include: { category: { select: { name: true } } },
    orderBy: { nextRunDate: "asc" },
  });
  return rules.filter((r) => r.skippedRunDate?.getTime() !== r.nextRunDate.getTime());
}

/**
 * Posts the rule's current (due) occurrence as a real Transaction, applies
 * its balance effect and advances nextRunDate by one cycle — all in one DB
 * transaction. `accountId` overrides the rule's account for this occurrence
 * only. The conditional update on nextRunDate makes a double click or a
 * second tab a no-op instead of a double deduction. Returns false if nothing
 * was due or the account isn't the user's.
 */
export async function processRecurringOccurrence(userId: string, ruleId: string, accountId?: string) {
  const rule = await db.recurringTransaction.findFirst({
    where: { id: ruleId, userId, type: { not: "TRANSFER" }, nextRunDate: { lte: new Date() } },
  });
  const account =
    rule && (await db.account.findFirst({ where: { id: accountId ?? rule.accountId, userId, isArchived: false } }));
  if (!rule || !account) return false;

  const [effect] = transactionEffects({
    type: rule.type,
    amount: rule.amount.toNumber(),
    accountId: account.id,
  });

  return db.$transaction(async (tx) => {
    const { count } = await tx.recurringTransaction.updateMany({
      where: { id: rule.id, nextRunDate: rule.nextRunDate },
      // Resetting reminderSentAt re-arms the "due in 2 days" email guard in
      // sendUpcomingRecurringReminders() for the next cycle.
      data: {
        nextRunDate: computeNextRunDate(rule.nextRunDate, rule.frequency, rule.dayOfMonth),
        reminderSentAt: null,
        skippedRunDate: null,
      },
    });
    if (count === 0) return false;

    await tx.transaction.create({
      data: {
        userId,
        type: rule.type,
        amount: rule.amount,
        date: rule.nextRunDate,
        description: rule.description,
        accountId: account.id,
        categoryId: rule.categoryId,
        recurringId: rule.id,
      },
    });
    await tx.account.update({
      where: { id: effect.accountId },
      data: { currentBalance: { increment: effect.delta } },
    });
    return true;
  });
}
