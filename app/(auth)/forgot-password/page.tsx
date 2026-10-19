"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthHeading, FormMessage, Pending } from "@/components/auth/auth-ui";
import { requestPasswordReset } from "../actions";

export default function ForgotPasswordPage() {
  const [email, setEmail] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [sent, setSent] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const { error } = await requestPasswordReset(email);
    setSubmitting(false);
    if (error) return setError(error);
    setSent(true);
  }

  if (sent) {
    return (
      <div className="text-center">
        <h1 className="font-display text-3xl mb-3">Check your email</h1>
        <p className="text-sm text-ink-muted">
          If an account exists for <span className="text-ink">{email}</span>, we sent a link to reset your password.
          Open it in this browser.
        </p>
        <Link href="/login" className="inline-block text-sm text-accent hover:underline mt-6">
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <>
      <AuthHeading title="Forgot password?" subtitle="Enter your account email and we'll send you a reset link." />
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

        {error && <FormMessage tone="error">{error}</FormMessage>}

        <Button type="submit" className="w-full h-11" disabled={submitting}>
          <Pending busy={submitting} idle="Send reset link" busyText="Sending…" />
        </Button>
      </form>

      <p className="text-sm text-ink-muted mt-8 text-center">
        Remembered it?{" "}
        <Link href="/login" className="text-accent hover:underline">
          Sign in
        </Link>
      </p>
    </>
  );
}
