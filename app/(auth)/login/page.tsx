"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/auth/password-input";
import { AuthHeading, FormMessage, Pending } from "@/components/auth/auth-ui";
import { signIn } from "../actions";

export default function LoginPage() {
  return (
    <React.Suspense fallback={null}>
      <LoginForm />
    </React.Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const { error } = await signIn(email, password);

    if (error) {
      setError(error);
      setSubmitting(false);
      return;
    }

    router.push(searchParams.get("next") || "/dashboard");
    router.refresh();
  }

  return (
    <>
      <AuthHeading title="Welcome back" subtitle="Sign in to continue to your ledger." />
      <form onSubmit={handleSubmit} className="space-y-5">
        {searchParams.get("reset") === "done" && (
          <FormMessage tone="success">Password updated. Sign in with your new password.</FormMessage>
        )}
        {searchParams.get("error") === "confirmation_failed" && (
          <FormMessage tone="error">That link is invalid or has expired. Please request a new one.</FormMessage>
        )}
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
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link href="/forgot-password" className="text-xs text-accent hover:underline">
              Forgot password?
            </Link>
          </div>
          <PasswordInput
            id="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        {error && <FormMessage tone="error">{error}</FormMessage>}

        <Button type="submit" className="w-full h-11" disabled={submitting}>
          <Pending busy={submitting} idle="Sign In" busyText="Signing in…" />
        </Button>
      </form>

      <p className="text-sm text-ink-muted mt-8 text-center">
        No account?{" "}
        <Link href="/signup" className="text-accent hover:underline">
          Sign up
        </Link>
      </p>
    </>
  );
}
