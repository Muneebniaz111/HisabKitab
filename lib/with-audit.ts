import { after } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { auditRequest, logAudit } from "@/lib/audit";

type Handler<Ctx> = (request: Request, ctx: Ctx) => Promise<Response>;

/** A fixed event name, or one picked from the request body (e.g. transfer vs. transaction). */
type AuditEvent = string | ((body: Record<string, unknown> | null) => string);

/**
 * Wraps a write route so every call lands in the audit log with its status
 * code and the exact response body the user got. An unhandled error becomes
 * a generic 500 — the details go to the server console only.
 *
 * The row is written in after(), once the response has been sent, so the
 * request isn't slowed down and a failed log write can't affect it. The
 * user lookup happens there too, since it's a round-trip to Supabase Auth.
 */
export function withAudit<Ctx>(event: AuditEvent, handler: Handler<Ctx>): Handler<Ctx> {
  return async (request, ctx) => {
    const name = typeof event === "string" ? event : event(await readJsonObject(request));
    const requestInfo = auditRequest(request.method, request.url, request.headers);

    let response: Response;
    try {
      response = await handler(request, ctx);
    } catch (err) {
      console.error(`[audit] ${name} threw:`, err);
      response = Response.json({ error: "Something went wrong." }, { status: 500 });
    }

    const body = await response.clone().json().catch(() => null);
    const { status } = response;
    after(async () => {
      const user = await getCurrentUser().catch(() => null);
      if (user) await logAudit(user.id, name, status, body, requestInfo);
    });

    return response;
  };
}

async function readJsonObject(request: Request): Promise<Record<string, unknown> | null> {
  const body = await request.clone().json().catch(() => null);
  return body && typeof body === "object" && !Array.isArray(body) ? body : null;
}
