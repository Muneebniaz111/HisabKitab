import { cache } from "react";
import { db } from "@/lib/db";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * The signed-in Supabase user. Wrapped in React's cache() so the layout, the
 * page and anything else rendered for the same request share one auth
 * round-trip instead of each making their own. proxy.ts has already rejected
 * signed-out and idle requests before any of this runs.
 */
export const getCurrentUser = cache(async () => {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

/**
 * The one place every route/page in this app gets the current user's id.
 * Supabase's auth.users.id (a UUID) is reused directly as our Prisma User.id
 * — no separate mapping table, since we always pass the id explicitly here.
 * The User row is only written when it's missing or the email changed, so a
 * normal request costs one indexed read rather than a write.
 */
export const getCurrentUserId = cache(async (): Promise<string> => {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("getCurrentUserId() called outside an authenticated request");
  }

  const email = user.email ?? "";
  const existing = await db.user.findUnique({ where: { id: user.id }, select: { email: true } });
  if (!existing) {
    await db.user.upsert({ where: { id: user.id }, update: {}, create: { id: user.id, email } });
  } else if (email && existing.email !== email) {
    await db.user.update({ where: { id: user.id }, data: { email } });
  }

  return user.id;
});
