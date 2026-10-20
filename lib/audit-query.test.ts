import { beforeEach, describe, expect, it, vi } from "vitest";

// An in-memory audit_logs table holding two users' rows. The fake findMany /
// findFirst understand just the where shapes queryAuditLog builds, so these
// tests check which rows come back rather than how the query is spelled.
type Row = { id: string; userId: string; event: string; success: boolean; statusCode: number; createdAt: Date; response: unknown };

const rows: Row[] = [];
const at = (iso: string) => new Date(iso);
function seed() {
  rows.length = 0;
  for (let i = 0; i < 35; i++) {
    rows.push({
      id: `a-${String(i).padStart(2, "0")}`,
      userId: "user-a",
      event: i % 2 ? "transaction.create" : "account.update",
      success: i % 3 !== 0,
      statusCode: i % 3 !== 0 ? 201 : 400,
      createdAt: at(`2026-10-${String(1 + (i % 20)).padStart(2, "0")}T10:00:00Z`),
      response: {},
    });
  }
  for (let i = 0; i < 5; i++) {
    rows.push({ id: `b-${i}`, userId: "user-b", event: "transaction.create", success: true, statusCode: 201, createdAt: at("2026-10-10T10:00:00Z"), response: {} });
  }
}

type Where = Record<string, unknown>;
function matches(row: Row, where: Where): boolean {
  return Object.entries(where).every(([key, cond]) => {
    if (key === "AND") return (cond as Where[]).every((w) => matches(row, w));
    if (key === "OR") return (cond as Where[]).some((w) => matches(row, w));
    const value = row[key as keyof Row];
    if (cond && typeof cond === "object" && !(cond instanceof Date)) {
      const c = cond as { gte?: Date; lt?: Date };
      if (c.gte && !((value as Date | string) >= c.gte)) return false;
      if (c.lt && !((value as Date | string) < c.lt)) return false;
      return true;
    }
    return cond instanceof Date ? (value as Date).getTime() === cond.getTime() : value === cond;
  });
}
const newestFirst = (a: Row, b: Row) => b.createdAt.getTime() - a.createdAt.getTime() || (a.id < b.id ? 1 : -1);

vi.mock("@/lib/db", () => ({
  db: {
    auditLog: {
      findMany: async ({ where, take }: { where: Where; take: number }) =>
        rows.filter((r) => matches(r, where)).sort(newestFirst).slice(0, take),
      findFirst: async ({ where }: { where: Where }) => rows.find((r) => matches(r, where)) ?? null,
    },
  },
}));

const getCurrentUserId = vi.fn();
vi.mock("@/lib/session", () => ({ getCurrentUserId: () => getCurrentUserId() }));

const { queryAuditLog } = await import("@/lib/audit-query");
const { GET } = await import("@/app/api/audit-log/route");

beforeEach(() => {
  seed();
  getCurrentUserId.mockResolvedValue("user-a");
});

describe("queryAuditLog", () => {
  it("never returns another user's rows, on any page", async () => {
    const first = await queryAuditLog("user-a", {});
    const second = await queryAuditLog("user-a", {}, first.nextCursor);

    expect(first.rows).toHaveLength(30);
    expect(second.rows).toHaveLength(5);
    expect(second.nextCursor).toBeNull();
    const ids = [...first.rows, ...second.rows].map((r) => r.id);
    expect(ids.every((id) => id.startsWith("a-"))).toBe(true);
    expect(new Set(ids).size).toBe(35); // no row skipped or repeated across pages
  });

  it("ignores a cursor that belongs to another user", async () => {
    const page = await queryAuditLog("user-a", {}, "b-0");
    expect(page.rows).toHaveLength(30);
    expect(page.rows.every((r) => r.id.startsWith("a-"))).toBe(true);
  });

  it("filters by event, status and Pakistan-time date range", async () => {
    const { rows: result } = await queryAuditLog("user-a", {
      event: "transaction.create",
      status: "failed",
      from: "2026-10-04",
      to: "2026-10-10",
    });
    expect(result.length).toBeGreaterThan(0);
    for (const r of result) {
      expect(r.event).toBe("transaction.create");
      expect(r.success).toBe(false);
      expect(r.createdAt >= "2026-10-03T19:00:00.000Z" && r.createdAt < "2026-10-10T19:00:00.000Z").toBe(true);
    }
  });
});

describe("GET /api/audit-log", () => {
  it("returns only the signed-in user's rows, even when another userId is passed", async () => {
    const res = await GET(new Request("http://localhost/api/audit-log?userId=user-b"));
    const body: { rows: { id: string }[] } = await res.json();

    expect(body.rows.length).toBeGreaterThan(0);
    expect(body.rows.every((r) => r.id.startsWith("a-"))).toBe(true);
  });
});
