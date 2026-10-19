"use server";

import { cookies, headers } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { activityCookie } from "@/lib/idle-session";
import { meetsPasswordPolicy } from "@/lib/validations/password";

// Signing in on the server lets us issue the idle-timeout cookie alongside the
// Supabase session — proxy.ts revokes any session that arrives without one.
export async function signIn(email: string, password: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: error.message };
  (await cookies()).set(activityCookie(data.user.id));
  return { error: null };
}

export async function signUp(email: string, password: string, emailRedirectTo: string) {
  if (!meetsPasswordPolicy(password)) return { error: "Password doesn't meet the requirements.", hasSession: false };
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo } });
  if (error) return { error: error.message, hasSession: false };
  if (data.session) (await cookies()).set(activityCookie(data.session.user.id));
  return { error: null, hasSession: !!data.session };
}

// Supabase never reveals whether the email has an account, so passing its
// error through (e.g. a rate limit) is safe. The link lands on /auth/callback,
// which opens a recovery session and forwards to /reset-password.
export async function requestPasswordReset(email: string) {
  const origin = (await headers()).get("origin");
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/reset-password`,
  });
  return { error: error?.message ?? null };
}

export async function updatePassword(password: string) {
  if (!meetsPasswordPolicy(password)) return { error: "Password doesn't meet the requirements." };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: error.message };
  // Ends every session for this user — including this recovery one — so the new password is needed everywhere.
  await supabase.auth.signOut({ scope: "global" });
  return { error: null };
}
