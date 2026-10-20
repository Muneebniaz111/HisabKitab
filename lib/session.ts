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
 * No database query: the User row is created by syncUser() when the session
 * is first issued.
 */
export const getCurrentUserId = cache(async (): Promise<string> => {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("getCurrentUserId() called outside an authenticated request");
  }
  return user.id;
});

/**
 * Creates the User row, or updates its email, for a freshly signed-in
 * Supabase user. Called wherever a session is issued — signIn, signUp and
 * /auth/callback — so the row exists before any request needs it.
 */
export async function syncUser(user: { id: string; email?: string | null }): Promise<void> {
  const email = user.email ?? "";
  await db.user.upsert({
    where: { id: user.id },
    update: email ? { email } : {},
    create: { id: user.id, email },
  });
}
