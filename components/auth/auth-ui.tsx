import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function AuthHeading({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-8">
      <h1 className="font-display text-3xl">{title}</h1>
      <p className="text-sm text-ink-muted mt-2">{subtitle}</p>
    </div>
  );
}

export function FormMessage({ tone, children }: { tone: "error" | "success"; children: React.ReactNode }) {
  const Icon = tone === "error" ? AlertCircle : CheckCircle2;
  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "flex items-start gap-2 rounded-sm px-3 py-2.5 text-sm animate-rise",
        tone === "error" ? "bg-debit-surface text-debit" : "bg-credit-surface text-credit"
      )}
    >
      <Icon className="size-4 mt-0.5 shrink-0" strokeWidth={2} />
      <span>{children}</span>
    </p>
  );
}

/** Submit-button label with a spinner while the request is in flight. */
export function Pending({ busy, idle, busyText }: { busy: boolean; idle: string; busyText: string }) {
  return busy ? (
    <>
      <Loader2 className="size-4 animate-spin" strokeWidth={2} />
      {busyText}
    </>
  ) : (
    idle
  );
}
