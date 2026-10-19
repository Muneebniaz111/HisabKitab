"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/auth/password-input";
import { AuthHeading, FormMessage, Pending } from "@/components/auth/auth-ui";
import { signUp } from "../actions";
import { meetsPasswordPolicy } from "@/lib/validations/password";
import { PasswordRules } from "@/components/auth/password-rules";

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

    const { error, hasSession } = await signUp(email, password, `${window.location.origin}/auth/callback`);

    if (error) {
      setError(error);
      setSubmitting(false);
      return;
    }

    // Supabase's default project settings require email confirmation
    // before a session exists — session is null in that case even though
    // signUp succeeded.
    if (!hasSession) {
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
        <h1 className="font-display text-3xl mb-3">Check your email</h1>
        <p className="text-sm text-ink-muted">
          We sent a confirmation link to <span className="text-ink">{email}</span>. Click it to
          finish creating your account.
        </p>
      </div>
    );
  }

  return (
    <>
      <AuthHeading title="Create your account" subtitle="Start tracking your money in under a minute." />
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            className="h-11 text-base sm:text-sm"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <PasswordInput
            id="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-describedby="password-rules"
            required
          />
          <PasswordRules id="password-rules" password={password} />
        </div>

        {error && <FormMessage tone="error">{error}</FormMessage>}

        <Button type="submit" className="w-full h-11" disabled={submitting || !meetsPasswordPolicy(password)}>
          <Pending busy={submitting} idle="Sign Up" busyText="Creating account…" />
        </Button>
      </form>

      <p className="text-sm text-ink-muted mt-8 text-center">
        Already have an account?{" "}
        <Link href="/login" className="text-accent hover:underline">
          Sign in
        </Link>
      </p>
    </>
  );
}
