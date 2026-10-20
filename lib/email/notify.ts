import { after } from "next/server";
import { db } from "@/lib/db";
import { sendEmail, sendEmailBatch, EMAIL_BATCH_SIZE, type EmailMessage } from "@/lib/email/client";
import {
  incomeAddedEmail,
  expenseAddedEmail,
  transferMadeEmail,
  savingAllocationEmail,
  savingsReminderEmail,
  recurringDueSoonEmail,
} from "@/lib/email/templates";
import { formatDate, todayISO } from "@/lib/dates";

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
//    plain async functions rather than after()-wrapped. The per-user
//    functions serve the dashboard; sendAllDueReminders() serves the cron.

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * The "due in 2 days" window: the calendar day two days after today in
 * Pakistan time. nextRunDate is stored as UTC midnight of its day, so the
 * window is that day's UTC range.
 */
function reminderWindow(now: Date) {
  const windowStart = new Date(`${todayISO(now)}T00:00:00Z`);
  windowStart.setUTCDate(windowStart.getUTCDate() + 2);
  const windowEnd = new Date(windowStart);
  windowEnd.setUTCDate(windowEnd.getUTCDate() + 1);
  return { windowStart, windowEnd };
}

// Guarded by RecurringTransaction.reminderSentAt so a daily run only sends
// one reminder per cycle — lib/recurring.ts resets it to null whenever
// nextRunDate advances, so the guard re-arms for the next cycle.
function dueSoonRuleWhere(now: Date) {
  const { windowStart, windowEnd } = reminderWindow(now);
  return {
    isActive: true,
    reminderSentAt: null,
    type: { not: "TRANSFER" as const },
    nextRunDate: { gte: windowStart, lt: windowEnd },
  };
}

const dueSoonRuleInclude = {
  account: { select: { name: true } },
  category: { select: { name: true } },
} as const;

type DueSoonRule = {
  type: "INCOME" | "EXPENSE" | "TRANSFER";
  description: string | null;
  amount: { toNumber(): number };
  nextRunDate: Date;
  account: { name: string };
  category: { name: string } | null;
};

function recurringReminderEmail(rule: DueSoonRule) {
  if (rule.type === "TRANSFER") return null;
  return recurringDueSoonEmail({
    description: rule.description ?? "",
    category: rule.category?.name ?? "",
    account: rule.account.name,
    amount: rule.amount.toNumber(),
    type: rule.type,
    dueDate: formatDate(rule.nextRunDate, { day: "numeric", month: "short" }),
  });
}

// One consolidated weekly digest per user (not one email per goal — with
// several active goals that would be a lot of separate emails for not much
// extra information). Guarded by User.lastSavingsReminderAt so running this
// daily still only sends once every 7 days.
const savingsDigestDueBefore = (now: Date) => new Date(now.getTime() - 7 * DAY_MS);

function savingsDigestEmail(goals: { name: string; currentAmount: { toNumber(): number }; targetAmount: { toNumber(): number } }[]) {
  return savingsReminderEmail(
    goals.map((g) => ({
      name: g.name,
      currentAmount: g.currentAmount.toNumber(),
      targetAmount: g.targetAmount.toNumber(),
    }))
  );
}

export async function sendSavingsReminderIfDue(userId: string, now: Date = new Date()): Promise<void> {
  const user = await db.user.findUnique({ where: { id: userId }, select: { email: true, lastSavingsReminderAt: true } });
  if (!user?.email) return;
  if (user.lastSavingsReminderAt && user.lastSavingsReminderAt > savingsDigestDueBefore(now)) return;

  const goals = await db.saving.findMany({
    where: { userId, status: "ACTIVE" },
    select: { name: true, currentAmount: true, targetAmount: true },
  });
  if (goals.length === 0) return;

  const { subject, html } = savingsDigestEmail(goals);
  await sendEmail({ to: user.email, subject, html });
  await db.user.update({ where: { id: userId }, data: { lastSavingsReminderAt: now } });
}

export async function sendUpcomingRecurringReminders(userId: string, now: Date = new Date()): Promise<void> {
  const user = await db.user.findUnique({ where: { id: userId }, select: { email: true } });
  if (!user?.email) return;

  const dueSoon = await db.recurringTransaction.findMany({
    where: { userId, ...dueSoonRuleWhere(now) },
    include: dueSoonRuleInclude,
  });

  for (const rule of dueSoon) {
    const email = recurringReminderEmail(rule);
    if (!email) continue;
    await sendEmail({ to: user.email, ...email });
    await db.recurringTransaction.update({ where: { id: rule.id }, data: { reminderSentAt: now } });
  }
}

type SendCounts = { sent: number; failed: number };

/**
 * Sends `items` through Resend's batch API, EMAIL_BATCH_SIZE per request,
 * and calls markSent() with the ids of each batch that went out. A failed
 * batch isn't marked, so tomorrow's run retries it.
 */
async function sendInBatches(
  items: { id: string; message: EmailMessage }[],
  markSent: (ids: string[]) => Promise<unknown>
): Promise<SendCounts> {
  const counts = { sent: 0, failed: 0 };
  for (let i = 0; i < items.length; i += EMAIL_BATCH_SIZE) {
    const batch = items.slice(i, i + EMAIL_BATCH_SIZE);
    if (await sendEmailBatch(batch.map((item) => item.message))) {
      await markSent(batch.map((item) => item.id));
      counts.sent += batch.length;
    } else {
      counts.failed += batch.length;
    }
  }
  return counts;
}

/**
 * Every due reminder for every user, for the daily cron. Queries only the
 * rules and users that actually have something due, then batch-sends, so a
 * run is a handful of queries plus one Resend call per 100 emails no matter
 * how many users there are.
 */
export async function sendAllDueReminders(now: Date = new Date()) {
  const rules = await db.recurringTransaction.findMany({
    where: { ...dueSoonRuleWhere(now), user: { email: { not: "" } } },
    include: { ...dueSoonRuleInclude, user: { select: { email: true } } },
  });
  const recurring = await sendInBatches(
    rules.flatMap((rule) => {
      const email = recurringReminderEmail(rule);
      return email ? [{ id: rule.id, message: { to: rule.user.email, ...email } }] : [];
    }),
    (ids) => db.recurringTransaction.updateMany({ where: { id: { in: ids } }, data: { reminderSentAt: now } })
  );

  const users = await db.user.findMany({
    where: {
      email: { not: "" },
      OR: [{ lastSavingsReminderAt: null }, { lastSavingsReminderAt: { lte: savingsDigestDueBefore(now) } }],
      savings: { some: { status: "ACTIVE" } },
    },
    select: {
      id: true,
      email: true,
      savings: { where: { status: "ACTIVE" }, select: { name: true, currentAmount: true, targetAmount: true } },
    },
  });
  const savings = await sendInBatches(
    users.map((user) => ({ id: user.id, message: { to: user.email, ...savingsDigestEmail(user.savings) } })),
    (ids) => db.user.updateMany({ where: { id: { in: ids } }, data: { lastSavingsReminderAt: now } })
  );

  return { recurring, savings };
}
