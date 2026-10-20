import { beforeEach, describe, expect, it, vi } from "vitest";

// after() normally runs once the response is sent; here it runs right away
// and the test awaits it, so the audit write can be asserted on.
const pendingAfter: Promise<unknown>[] = [];
vi.mock("next/server", () => ({
  after: (task: () => Promise<unknown>) => {
    pendingAfter.push(Promise.resolve().then(task));
  },
}));

const getCurrentUser = vi.fn();
vi.mock("@/lib/session", () => ({ getCurrentUser: () => getCurrentUser() }));

const create = vi.fn();
vi.mock("@/lib/db", () => ({ db: { auditLog: { create: (args: unknown) => create(args) } } }));

const { withAudit } = await import("@/lib/with-audit");

const flushAfter = () => Promise.all(pendingAfter.splice(0));
const post = (body: unknown, url = "http://localhost/api/test") =>
  new Request(url, {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "x-forwarded-for": "39.45.12.7, 10.0.0.1", "user-agent": "TestBrowser/1.0" },
  });
const requestFields = { method: "POST", path: "/api/test", ipAddress: "39.45.12.7", userAgent: "TestBrowser/1.0" };

beforeEach(() => {
  vi.clearAllMocks();
  getCurrentUser.mockResolvedValue({ id: "user-1" });
  create.mockResolvedValue({});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("withAudit", () => {
  it("records a successful request with success: true and its status code and body", async () => {
    const body = { id: "t-1", type: "EXPENSE", amount: 1000 };
    const route = withAudit("transaction.create", async () => Response.json(body, { status: 201 }));

    const res = await route(post({}), undefined);
    await flushAfter();

    expect(res.status).toBe(201);
    expect(await res.json()).toEqual(body);
    expect(create).toHaveBeenCalledWith({
      data: { userId: "user-1", event: "transaction.create", success: true, statusCode: 201, response: body, ...requestFields },
    });
  });

  it("records a failed request with success: false and the error response", async () => {
    const error = { error: "Insufficient funds in HBL Bank." };
    const route = withAudit("transaction.create", async () => Response.json(error, { status: 400 }));

    await route(post({}), undefined);
    await flushAfter();

    expect(create).toHaveBeenCalledWith({
      data: { userId: "user-1", event: "transaction.create", success: false, statusCode: 400, response: error, ...requestFields },
    });
  });

  it("turns an unhandled error into a generic 500 and stores no internal details", async () => {
    const route = withAudit("account.update", async () => {
      throw new Error("connection to db-internal:5432 refused");
    });

    const res = await route(post({}), undefined);
    await flushAfter();

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "Something went wrong." });
    const stored = create.mock.calls[0][0].data;
    expect(stored).toMatchObject({ success: false, statusCode: 500, response: { error: "Something went wrong." } });
    const serialized = JSON.stringify(stored);
    expect(serialized).not.toContain("db-internal");
    expect(serialized).not.toContain("at ");
  });

  it("returns the original response when the log write fails", async () => {
    create.mockRejectedValue(new Error("audit_logs is unavailable"));
    const route = withAudit("saving.create", async () => Response.json({ id: "s-1" }, { status: 201 }));

    const res = await route(post({}), undefined);
    await expect(flushAfter()).resolves.toBeDefined();

    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ id: "s-1" });
  });

  it("picks the event from the request body and leaves the body readable for the handler", async () => {
    const route = withAudit(
      (body) => (body?.type === "TRANSFER" ? "transfer.create" : "transaction.create"),
      async (request) => Response.json(await request.json(), { status: 201 })
    );

    const res = await route(post({ type: "TRANSFER" }), undefined);
    await flushAfter();

    expect(await res.json()).toEqual({ type: "TRANSFER" });
    expect(create.mock.calls[0][0].data.event).toBe("transfer.create");
  });

  it("stores the path without its query string, and the client's IP", async () => {
    const route = withAudit("account.update", async () => Response.json({}, { status: 200 }));

    await route(post({}, "http://localhost/api/accounts/a-1?token=SECRET123"), undefined);
    await flushAfter();

    const stored = create.mock.calls[0][0].data;
    expect(stored).toMatchObject({ method: "POST", path: "/api/accounts/a-1", ipAddress: "39.45.12.7" });
    expect(JSON.stringify(stored)).not.toContain("SECRET123");
  });

  it("writes nothing when there's no signed-in user", async () => {
    getCurrentUser.mockResolvedValue(null);
    const route = withAudit("account.create", async () => Response.json({ error: "Session expired" }, { status: 401 }));

    await route(post({}), undefined);
    await flushAfter();

    expect(create).not.toHaveBeenCalled();
  });
});
