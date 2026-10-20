import { Resend } from "resend";

let cachedClient: Resend | null = null;

const FROM = process.env.EMAIL_FROM ?? "Hisab-Kitab <onboarding@resend.dev>";

// Resend's batch endpoint accepts at most 100 emails per request.
export const EMAIL_BATCH_SIZE = 100;
// Resend's default rate limit is 2 requests per second.
const BATCH_SPACING_MS = 600;

export type EmailMessage = { to: string; subject: string; html: string };

function getClient(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null;
  if (!cachedClient) cachedClient = new Resend(process.env.RESEND_API_KEY);
  return cachedClient;
}

/**
 * Sends an email if RESEND_API_KEY is configured; logs and no-ops
 * otherwise. Deliberately never throws — a notification email is a side
 * effect of a financial transaction, never a precondition for one. Every
 * caller in lib/email/notify.ts wraps this in Next's after(), so it runs
 * once the response has already gone back to the user; a failed send
 * shows up in server logs, not as a broken save button.
 */
export async function sendEmail({ to, subject, html }: EmailMessage): Promise<void> {
  const resend = getClient();

  if (!resend) {
    console.warn(`[email] RESEND_API_KEY not set — skipped "${subject}" to ${to}`);
    return;
  }

  try {
    const { error } = await resend.emails.send({
      from: FROM,
      to,
      subject,
      html,
    });
    if (error) {
      console.error(`[email] Resend rejected "${subject}" to ${to}:`, error);
    }
  } catch (err) {
    console.error(`[email] failed to send "${subject}" to ${to}:`, err);
  }
}

let lastBatchAt = 0;

/**
 * Sends up to EMAIL_BATCH_SIZE emails in one Resend request. Returns whether
 * the batch was accepted, so the caller only marks those reminders as sent.
 * Like sendEmail(), never throws; failures are logged.
 */
export async function sendEmailBatch(messages: EmailMessage[]): Promise<boolean> {
  const resend = getClient();

  if (!resend) {
    console.warn(`[email] RESEND_API_KEY not set — skipped a batch of ${messages.length}`);
    return false;
  }

  const wait = lastBatchAt + BATCH_SPACING_MS - Date.now();
  if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
  lastBatchAt = Date.now();

  try {
    const { error } = await resend.batch.send(messages.map((m) => ({ from: FROM, ...m })));
    if (error) {
      console.error(`[email] Resend rejected a batch of ${messages.length}:`, error);
      return false;
    }
    return true;
  } catch (err) {
    console.error(`[email] failed to send a batch of ${messages.length}:`, err);
    return false;
  }
}
