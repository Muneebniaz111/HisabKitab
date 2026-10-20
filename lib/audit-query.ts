import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { AUDIT_EVENTS } from "@/lib/audit-events";
import { startOfDayInPakistan } from "@/lib/dates";

export const AUDIT_PAGE_SIZE = 30;

export type AuditFilters = {
  event?: string | null;
  status?: string | null; // "success" | "failed"
  from?: string | null; // "YYYY-MM-DD", Pakistan time, inclusive
  to?: string | null; // "YYYY-MM-DD", Pakistan time, inclusive
};

export type AuditRow = {
  id: string;
  createdAt: string; // ISO
  event: string;
  success: boolean;
  statusCode: number;
  response: unknown;
  method: string;
  path: string;
  ipAddress: string | null;
  userAgent: string | null;
};

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * One page of the user's audit log, newest first, shared by GET
 * /api/audit-log and the /audit-log page. `userId` must come from the
 * session — it's what keeps users to their own rows. `cursor` is the id of
 * the last row of the previous page.
 */
export async function queryAuditLog(
  userId: string,
  filters: AuditFilters,
  cursor?: string | null
): Promise<{ rows: AuditRow[]; nextCursor: string | null }> {
  const where: Prisma.AuditLogWhereInput = { userId };

  if (filters.event && (AUDIT_EVENTS as readonly string[]).includes(filters.event)) where.event = filters.event;
  if (filters.status === "success") where.success = true;
  if (filters.status === "failed") where.success = false;

  const createdAt: Prisma.DateTimeFilter = {};
  if (filters.from && DATE.test(filters.from)) createdAt.gte = startOfDayInPakistan(filters.from);
  if (filters.to && DATE.test(filters.to)) createdAt.lt = new Date(startOfDayInPakistan(filters.to).getTime() + DAY_MS);
  if (createdAt.gte || createdAt.lt) where.createdAt = createdAt;

  // Keyset pagination on (createdAt, id): rows strictly after the cursor row
  // in newest-first order. The cursor is looked up within this user's rows.
  const after = cursor
    ? await db.auditLog.findFirst({ where: { id: cursor, userId }, select: { id: true, createdAt: true } })
    : null;
  const page = after
    ? { AND: [where, { OR: [{ createdAt: { lt: after.createdAt } }, { createdAt: after.createdAt, id: { lt: after.id } }] }] }
    : where;

  const rows = await db.auditLog.findMany({
    where: page,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: AUDIT_PAGE_SIZE + 1,
    select: {
      id: true,
      createdAt: true,
      event: true,
      success: true,
      statusCode: true,
      response: true,
      method: true,
      path: true,
      ipAddress: true,
      userAgent: true,
    },
  });

  const hasMore = rows.length > AUDIT_PAGE_SIZE;
  const pageRows = rows.slice(0, AUDIT_PAGE_SIZE);
  return {
    rows: pageRows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })),
    nextCursor: hasMore ? pageRows[pageRows.length - 1].id : null,
  };
}
