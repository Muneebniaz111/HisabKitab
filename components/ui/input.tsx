import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "h-10 w-full rounded-sm border border-rule bg-paper px-3 text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:ring-1 focus:ring-accent",
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";
