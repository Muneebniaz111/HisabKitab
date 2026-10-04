"use client";

import * as React from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";

export function Amount({
  value,
  className,
  prefix = "",
  suffix = "",
}: {
  value: number;
  className?: string;
  prefix?: string;
  suffix?: string;
}) {
  const [visible, setVisible] = React.useState(false);

  return (
    <span className="inline-flex min-w-0 max-w-full items-center gap-1.5">
      <span className={cn("min-w-0 truncate", className)}>
        {visible ? `${prefix}${formatCurrency(value)}${suffix}` : "Rs. ****"}
      </span>
      <button
        type="button"
        onClick={() => setVisible((current) => !current)}
        className="inline-flex size-6 shrink-0 items-center justify-center rounded-sm text-ink-muted transition-colors hover:bg-accent-surface hover:text-ink focus:outline-none focus:ring-1 focus:ring-accent"
        aria-label={visible ? "Hide amount" : "Show amount"}
        title={visible ? "Hide amount" : "Show amount"}
      >
        {visible ? <EyeOff className="size-3.5" strokeWidth={1.75} /> : <Eye className="size-3.5" strokeWidth={1.75} />}
      </button>
    </span>
  );
}
