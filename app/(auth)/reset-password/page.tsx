"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/auth/password-input";
import { AuthHeading, FormMessage, Pending } from "@/components/auth/auth-ui";
import { PasswordRules } from "@/components/auth/password-rules";
import { meetsPasswordPolicy } from "@/lib/validations/password";
import { updatePassword } from "../actions";

// Reached from the emailed reset link via /auth/callback, which opens a recovery
// session — proxy.ts sends anyone without a session to /login instead.
export default function ResetPasswordPage() {
  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) return setError("Passwords don't match.");
    setError(null);
    setSubmitting(true);
    const { error } = await updatePassword(password);
    if (error) {
      setError(error);
      setSubmitting(false);
      return;
    }
    location.replace("/login?reset=done");
  }

  return (
    <>
      <AuthHeading title="Set a new password" subtitle="Choose a strong password you haven't used before." />
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-1.5">
          <Label htmlFor="password">New password</Label>
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
        <div className="space-y-1.5">
          <Label htmlFor="confirm">Confirm new password</Label>
          <PasswordInput
            id="confirm"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
          />
          {confirm && confirm !== password && <p className="text-xs text-debit">Passwords don&apos;t match.</p>}
        </div>

        {error && <FormMessage tone="error">{error}</FormMessage>}

        <Button type="submit" className="w-full h-11" disabled={submitting || !meetsPasswordPolicy(password)}>
          <Pending busy={submitting} idle="Update password" busyText="Saving…" />
        </Button>
      </form>
    </>
  );
}
