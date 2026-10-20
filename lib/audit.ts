import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

export const AUDIT_RETENTION_DAYS = 90;

export type AuditRequest = { method: string; path: string; ipAddress: string | null; userAgent: string | null };

/**
 * The request details stored with each row. Only the URL's path is kept —
 * never its query string. The IP is the client's (first x-forwarded-for
 * entry, which Vercel sets), so users can spot activity that wasn't theirs.
 */
export function auditRequest(method: string, url: string, headers: Headers): AuditRequest {
  const forwardedFor = headers.get("x-forwarded-for")?.split(",")[0].trim();
  return {
    method,
    path: new URL(url, "http://localhost").pathname,
    ipAddress: forwardedFor || headers.get("x-real-ip") || null,
    userAgent: headers.get("user-agent")?.slice(0, 500) ?? null,
  };
}

/** Deletes rows older than AUDIT_RETENTION_DAYS. Run daily by the cron. */
export async function deleteExpiredAuditLogs(now: Date = new Date()): Promise<number> {
  const cutoff = new Date(now.getTime() - AUDIT_RETENTION_DAYS * 24 * 60 * 60 * 1000);
  const { count } = await db.auditLog.deleteMany({ where: { createdAt: { lt: cutoff } } });
  return count;
}

/**
 * Records one audit row. `response` must be the body the user actually
 * received — never an internal error or stack trace. Never throws: a failed
 * log write is logged to the console and the user's action is unaffected.
 */
export async function logAudit(
  userId: string,
  event: string,
  statusCode: number,
  response: unknown,
  request: AuditRequest
): Promise<void> {
  try {
    await db.auditLog.create({
      data: {
        userId,
        event,
        success: statusCode < 400,
        statusCode,
        response: (response ?? {}) as Prisma.InputJsonValue,
        ...request,
      },
    });
  } catch (err) {
    console.error(`[audit] couldn't record ${event}:`, err);
  }
}
