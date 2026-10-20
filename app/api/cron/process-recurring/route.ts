import { NextResponse } from "next/server";
import { sendAllDueReminders } from "@/lib/email/notify";
import { deleteExpiredAuditLogs } from "@/lib/audit";

/**
 * Intended to be hit daily by Vercel Cron (or any scheduler) — see
 * vercel.json. Sends the "due in 2 days" reminder for upcoming recurring
 * transactions and the weekly savings digest if 7+ days have passed. Due
 * recurring transactions are NOT posted here: the user confirms each one
 * in the app (components/recurring/due-recurring-prompt.tsx). The dashboard
 * also sends both emails lazily as a fallback. Also deletes audit log rows
 * past their retention period.
 */
// Reminder emails are sent in spaced Resend batches; leave room for a few
// thousand users within one run.
export const maxDuration = 60;

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await sendAllDueReminders();
  console.log(
    `[cron] recurring reminders: ${result.recurring.sent} sent, ${result.recurring.failed} failed; ` +
      `savings digests: ${result.savings.sent} sent, ${result.savings.failed} failed`
  );

  const auditLogsDeleted = await deleteExpiredAuditLogs();
  console.log(`[cron] audit log: ${auditLogsDeleted} expired rows deleted`);

  return NextResponse.json({ ...result, auditLogsDeleted });
}
