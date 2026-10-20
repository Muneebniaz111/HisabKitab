"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { AUDIT_EVENTS } from "@/lib/audit-events";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

const STATUS_TABS: { label: string; value: string | null }[] = [
  { label: "All", value: null },
  { label: "Success", value: "success" },
  { label: "Failed", value: "failed" },
];

const dateInputClass =
  "h-10 min-w-0 max-w-full rounded-sm border border-rule bg-paper px-3 text-sm text-ink focus:outline-none focus:ring-1 focus:ring-accent";

export function AuditLogFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function updateParam(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`${pathname}?${params.toString()}`);
  }

  const event = searchParams.get("event") ?? "ALL";
  const status = searchParams.get("status");
  const from = searchParams.get("from") ?? "";
  const to = searchParams.get("to") ?? "";

  return (
    <div className="flex flex-wrap items-center gap-4 px-4 sm:px-6 lg:px-10 py-4 border-b border-rule">
      <div className="flex items-center gap-1 rounded-sm border border-rule p-1">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.label}
            onClick={() => updateParam("status", tab.value)}
            className={cn(
              "px-3 py-1.5 text-sm rounded-sm transition-colors whitespace-nowrap",
              status === tab.value ? "bg-accent text-paper" : "text-ink-muted hover:text-ink hover:bg-accent-surface"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <Select value={event} onValueChange={(v) => updateParam("event", v === "ALL" ? null : v)}>
        <SelectTrigger className="w-52">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">All events</SelectItem>
          {AUDIT_EVENTS.map((e) => (
            <SelectItem key={e} value={e}>
              {e}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="flex items-center gap-2">
        <input
          type="date"
          value={from}
          max={to || undefined}
          onChange={(e) => updateParam("from", e.target.value || null)}
          aria-label="From date"
          className={dateInputClass}
        />
        <span className="text-xs text-ink-muted">to</span>
        <input
          type="date"
          value={to}
          min={from || undefined}
          onChange={(e) => updateParam("to", e.target.value || null)}
          aria-label="To date"
          className={dateInputClass}
        />
      </div>

      {(status || event !== "ALL" || from || to) && (
        <button
          onClick={() => router.push(pathname)}
          className="text-xs text-ink-muted hover:text-ink underline underline-offset-2"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}
