import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { processDueRecurringTransactions } from "@/lib/recurring";
import { sendSavingsReminderIfDue, sendUpcomingRecurringReminders } from "@/lib/email/notify";

/**
 * Intended to be hit daily by Vercel Cron (or any scheduler) — see
 * README for the vercel.json config. Does three things per user, in
 * order: materializes any due recurring transactions, sends the "due in
 * 2 days" reminder for upcoming ones, and sends the weekly savings
 * digest if 7+ days have passed. The app also runs all three lazily from
 * the dashboard as a fallback, so everything still works correctly even
 * without this cron configured — this endpoint just makes it happen on
 * schedule rather than "next time someone opens the app."
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const users = await db.user.findMany({ select: { id: true } });

  let totalCreated = 0;
  for (const user of users) {
    totalCreated += await processDueRecurringTransactions(user.id);
    await sendUpcomingRecurringReminders(user.id);
    await sendSavingsReminderIfDue(user.id);
  }

  return NextResponse.json({ usersProcessed: users.length, transactionsCreated: totalCreated });
}
