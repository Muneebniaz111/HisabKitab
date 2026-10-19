import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendSavingsReminderIfDue, sendUpcomingRecurringReminders } from "@/lib/email/notify";

/**
 * Intended to be hit daily by Vercel Cron (or any scheduler) — see
 * vercel.json. Sends the "due in 2 days" reminder for upcoming recurring
 * transactions and the weekly savings digest if 7+ days have passed. Due
 * recurring transactions are NOT posted here: the user confirms each one
 * in the app (components/recurring/due-recurring-prompt.tsx). The dashboard
 * also sends both emails lazily as a fallback.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const users = await db.user.findMany({ select: { id: true } });

  for (const user of users) {
    await sendUpcomingRecurringReminders(user.id);
    await sendSavingsReminderIfDue(user.id);
  }

  return NextResponse.json({ usersProcessed: users.length });
}
