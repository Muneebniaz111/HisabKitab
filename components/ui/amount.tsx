"use client";

import * as React from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";

// Pass `visible` + `onVisibleChange` to hold the state outside — chart tooltips
// remount their content, so a revealed amount there must live in the chart.
export function Amount({
  value,
  className,
  prefix = "",
  suffix = "",
  visible: controlledVisible,
  onVisibleChange,
}: {
  value: number;
  className?: string;
  prefix?: string;
  suffix?: string;
  visible?: boolean;
  onVisibleChange?: (visible: boolean) => void;
}) {
  const [ownVisible, setOwnVisible] = React.useState(false);
  const visible = controlledVisible ?? ownVisible;

  return (
    <span className="inline-flex min-w-0 max-w-full items-center gap-1.5">
      <span className={cn("min-w-0 truncate", className)}>
        {visible ? `${prefix}${formatCurrency(value)}${suffix}` : "Rs. ****"}
      </span>
      <button
        type="button"
        onClick={() => (onVisibleChange ?? setOwnVisible)(!visible)}
        // The ::after pad widens the tap target to ~32px without changing the 24px look.
        className="relative inline-flex size-6 shrink-0 touch-manipulation items-center justify-center rounded-sm text-ink-muted transition-colors after:absolute after:-inset-1 hover:bg-accent-surface hover:text-ink focus:outline-none focus:ring-1 focus:ring-accent"
        aria-label={visible ? "Hide amount" : "Show amount"}
        title={visible ? "Hide amount" : "Show amount"}
      >
        {visible ? <EyeOff className="size-3.5" strokeWidth={1.75} /> : <Eye className="size-3.5" strokeWidth={1.75} />}
      </button>
    </span>
  );
}
