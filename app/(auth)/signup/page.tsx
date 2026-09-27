"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [checkEmail, setCheckEmail] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const supabase = createSupabaseBrowserClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });

    if (error) {
      setError(error.message);
      setSubmitting(false);
      return;
    }

    // Supabase's default project settings require email confirmation
    // before a session exists — session is null in that case even though
    // signUp succeeded.
    if (!data.session) {
      setCheckEmail(true);
      setSubmitting(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  if (checkEmail) {
    return (
      <div className="text-center">
        <h1 className="font-display text-2xl mb-3">Check your email</h1>
        <p className="text-sm text-ink-muted">
          We sent a confirmation link to <span className="text-ink">{email}</span>. Click it to
          finish creating your account.
        </p>
      </div>
    );
  }

  return (
    <>
      <h1 className="font-display text-2xl mb-6">Create an account</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        {error && <p className="text-sm text-debit">{error}</p>}

        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? "Creating account…" : "Sign Up"}
        </Button>
      </form>

      <p className="text-sm text-ink-muted mt-6 text-center">
        Already have an account?{" "}
        <Link href="/login" className="text-accent hover:underline">
          Sign in
        </Link>
      </p>
    </>
  );
}
