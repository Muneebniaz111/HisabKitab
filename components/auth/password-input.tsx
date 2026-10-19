"use client";

import * as React from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";

export function PasswordInput(props: Omit<React.InputHTMLAttributes<HTMLInputElement>, "type">) {
  const [shown, setShown] = React.useState(false);
  return (
    <div className="relative">
      <Input {...props} type={shown ? "text" : "password"} className="h-11 pr-11 text-base sm:text-sm" />
      <button
        type="button"
        onClick={() => setShown((s) => !s)}
        className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-sm text-ink-muted transition-colors hover:text-ink"
        aria-label={shown ? "Hide password" : "Show password"}
      >
        {shown ? <EyeOff className="size-4" strokeWidth={1.75} /> : <Eye className="size-4" strokeWidth={1.75} />}
      </button>
    </div>
  );
}
