import { after } from "next/server";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email/client";
import {
  incomeAddedEmail,
  expenseAddedEmail,
  transferMadeEmail,
  savingAllocationEmail,
  savingsReminderEmail,
  recurringDueSoonEmail,
} from "@/lib/email/templates";

async function getUserEmail(userId: string): Promise<string | null> {
  const user = await db.user.findUnique({ where: { id: userId }, select: { email: true } });
  return user?.email || null;
}

// Every function here follows the same shape: schedule the work with
// after() and return immediately. The API route that calls these has
// already committed its db.$transaction and can respond to the client
// without waiting on network I/O to Resend.

export function notifyIncomeAdded(
  userId: string,
  p: { description: string; category: string; account: string; amount: number; date: string }
) {
  after(async () => {
    const email = await getUserEmail(userId);
    if (!email) return;
    const { subject, html } = incomeAddedEmail(p);
    await sendEmail({ to: email, subject, html });
  });
}

export function notifyExpenseAdded(
  userId: string,
  p: { description: string; category: string; account: string; amount: number; date: string }
) {
  after(async () => {
    const email = await getUserEmail(userId);
    if (!email) return;
    const { subject, html } = expenseAddedEmail(p);
    await sendEmail({ to: email, subject, html });
  });
}

export function notifyTransferMade(
  userId: string,
  p: { fromAccount: string; toAccount: string; amount: number; date: string }
) {
  after(async () => {
    const email = await getUserEmail(userId);
    if (!email) return;
    const { subject, html } = transferMadeEmail(p);
    await sendEmail({ to: email, subject, html });
  });
}

export function notifySavingAllocation(
  userId: string,
  p: {
    direction: "ALLOCATE" | "WITHDRAW";
    goalName: string;
    account: string;
    amount: number;
    newTotal: number;
    date: string;
  }
) {
  after(async () => {
    const email = await getUserEmail(userId);
    if (!email) return;
    const { subject, html } = savingAllocationEmail(p);
    await sendEmail({ to: email, subject, html });
  });
}

// ── Reminders — called from the daily cron and the dashboard's lazy
//    catch-up, not from a request handler's hot path, so these are
//    plain async functions rather than after()-wrapped.

/**
 * Sends one consolidated weekly digest per user (not one email per goal —
 * with several active goals that would be a lot of separate emails for
 * not much extra information). Guarded by User.lastSavingsReminderAt so
 * running this daily still only sends once every 7 days.
 */
export async function sendSavingsReminderIfDue(userId: string, now: Date = new Date()): Promise<void> {
  const user = await db.user.findUnique({ where: { id: userId }, select: { email: true, lastSavingsReminderAt: true } });
  if (!user?.email) return;

  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  if (user.lastSavingsReminderAt && user.lastSavingsReminderAt > sevenDaysAgo) return;

  // Same class of bug as the Account Statement fix: Prisma returns Decimal
  // fields as Decimal objects at runtime even though these are typed
  // `number` here — convert explicitly rather than relying on which
  // operators happen to coerce correctly.
  const rawGoals = await db.saving.findMany({
    where: { userId, status: "ACTIVE" },
    select: { name: true, currentAmount: true, targetAmount: true },
  });
  if (rawGoals.length === 0) return;

  const goals = rawGoals.map((g) => ({
    name: g.name,
    currentAmount: Number(g.currentAmount),
    targetAmount: Number(g.targetAmount),
  }));

  const { subject, html } = savingsReminderEmail(goals);
  await sendEmail({ to: user.email, subject, html });
  await db.user.update({ where: { id: userId }, data: { lastSavingsReminderAt: now } });
}

/**
 * Sends a "due in 2 days" reminder for every active recurring rule whose
 * nextRunDate is exactly 2 days out. Guarded by
 * RecurringTransaction.reminderSentAt so a daily cron run only sends one
 * reminder per cycle — lib/recurring.ts resets reminderSentAt to null
 * whenever nextRunDate advances, so the guard re-arms for the next cycle.
 */
export async function sendUpcomingRecurringReminders(userId: string, now: Date = new Date()): Promise<void> {
  const user = await db.user.findUnique({ where: { id: userId }, select: { email: true } });
  if (!user?.email) return;

  const windowStart = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
  windowStart.setUTCHours(0, 0, 0, 0);
  const windowEnd = new Date(windowStart);
  windowEnd.setUTCDate(windowEnd.getUTCDate() + 1);

  const dueSoon = await db.recurringTransaction.findMany({
    where: {
      userId,
      isActive: true,
      reminderSentAt: null,
      nextRunDate: { gte: windowStart, lt: windowEnd },
    },
    include: {
      account: { select: { name: true } },
      category: { select: { name: true } },
    },
  });

  for (const rule of dueSoon) {
    if (rule.type === "TRANSFER") continue;
    const { subject, html } = recurringDueSoonEmail({
      description: rule.description ?? "",
      category: rule.category?.name ?? "",
      account: rule.account.name,
      amount: Number(rule.amount),
      type: rule.type,
      dueDate: rule.nextRunDate.toLocaleDateString("en-PK", { day: "numeric", month: "short" }),
    });
    await sendEmail({ to: user.email, subject, html });
    await db.recurringTransaction.update({ where: { id: rule.id }, data: { reminderSentAt: now } });
  }
}
