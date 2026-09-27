import { Resend } from "resend";

let cachedClient: Resend | null = null;

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
export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}): Promise<void> {
  const resend = getClient();

  if (!resend) {
    console.warn(`[email] RESEND_API_KEY not set — skipped "${subject}" to ${to}`);
    return;
  }

  try {
    const { error } = await resend.emails.send({
      from: process.env.EMAIL_FROM ?? "Hisab-Kitab <onboarding@resend.dev>",
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
