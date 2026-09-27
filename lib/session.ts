import { db } from "@/lib/db";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * The one place every route/page in this app gets the current user's id.
 * Backed by the real Supabase session now — middleware.ts guarantees this
 * only runs for authenticated requests on protected routes, so `user` is
 * only null here if it's called somewhere middleware doesn't cover.
 *
 * Supabase's auth.users.id (a UUID) is reused directly as our Prisma
 * User.id — no separate mapping table, no @default(uuid()) collision,
 * since we always pass the id explicitly here.
 */
export async function getCurrentUserId(): Promise<string> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("getCurrentUserId() called outside an authenticated request");
  }

  await db.user.upsert({
    where: { id: user.id },
    update: { email: user.email ?? undefined },
    create: { id: user.id, email: user.email ?? "" },
  });

  return user.id;
}

