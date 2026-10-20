"use server";

import { cookies, headers } from "next/headers";
import { after } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { activityCookie } from "@/lib/idle-session";
import { getCurrentUser, syncUser } from "@/lib/session";
import { auditRequest, logAudit } from "@/lib/audit";
import { meetsPasswordPolicy } from "@/lib/validations/password";

// Signing in on the server lets us issue the idle-timeout cookie alongside the
// Supabase session — proxy.ts revokes any session that arrives without one.
// Server actions are POSTs to the page they were called from (the Referer).
async function actionRequest() {
  const h = await headers();
  return auditRequest("POST", h.get("referer") ?? "/", h);
}

export async function signIn(email: string, password: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: error.message };
  await syncUser(data.user);
  (await cookies()).set(activityCookie(data.user.id));
  const result = { error: null };
  // Only successful sign-ins are logged: a failed one has no user to attach to.
  const request = await actionRequest();
  after(() => logAudit(data.user.id, "auth.sign_in", 200, result, request));
  return result;
}

export async function signOut() {
  const user = await getCurrentUser();
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signOut();
  if (error) return { error: error.message };
  const result = { error: null };
  const request = await actionRequest();
  if (user) after(() => logAudit(user.id, "auth.sign_out", 200, result, request));
  return result;
}

export async function signUp(email: string, password: string, emailRedirectTo: string) {
  if (!meetsPasswordPolicy(password)) return { error: "Password doesn't meet the requirements.", hasSession: false };
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo } });
  if (error) return { error: error.message, hasSession: false };
  // Without a session (email confirmation pending) data.user may be a
  // placeholder Supabase returns to hide whether the email is taken, so the
  // row is created by /auth/callback once the email is confirmed instead.
  if (data.session) {
    await syncUser(data.session.user);
    (await cookies()).set(activityCookie(data.session.user.id));
  }
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
  const { data, error } = await supabase.auth.updateUser({ password });
  if (error) return { error: error.message };
  // Ends every session for this user — including this recovery one — so the new password is needed everywhere.
  await supabase.auth.signOut({ scope: "global" });
  const result = { error: null };
  const request = await actionRequest();
  after(() => logAudit(data.user.id, "auth.password_change", 200, result, request));
  return result;
}
