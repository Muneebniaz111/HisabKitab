import { createHmac, timingSafeEqual } from "node:crypto";

// Server-side idle timeout. The cookie is `userId.lastActivityMs.hmac`, has no
// maxAge (so it dies with the browser) and is re-signed by proxy.ts on every
// request. Without a fresh, correctly signed one, the Supabase session is revoked.
export const IDLE_COOKIE = "hk_active";
// IDLE_TIMEOUT_MINUTES configures it; components/auth/idle-logout.tsx gets the
// same value from the app layout, so client and server always agree.
export const IDLE_TIMEOUT_MS = (Number(process.env.IDLE_TIMEOUT_MINUTES) || 15) * 60_000;

const sign = (data: string) => createHmac("sha256", process.env.SESSION_SECRET!).update(data).digest("base64url");

export function activityCookie(userId: string) {
  const data = `${userId}.${Date.now()}`;
  return {
    name: IDLE_COOKIE,
    value: `${data}.${sign(data)}`,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
  };
}

export function isActive(cookie: string | undefined, userId: string) {
  const [id, ts, sig = ""] = cookie?.split(".") ?? [];
  const expected = sign(`${id}.${ts}`);
  return (
    id === userId &&
    Date.now() - Number(ts) < IDLE_TIMEOUT_MS &&
    sig.length === expected.length &&
    timingSafeEqual(Buffer.from(sig), Buffer.from(expected))
  );
}
