"use client";

import * as React from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDateTime } from "@/lib/dates";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { AuditFilters, AuditRow } from "@/lib/audit-query";

// Starts with the server-rendered first page; "Load more" appends the next
// pages from GET /api/audit-log with the same filters. The page re-mounts this
// (via `key`) whenever the filters change, so stale rows never mix in.
export function AuditLogTable({
  initialRows,
  initialCursor,
  filters,
}: {
  initialRows: AuditRow[];
  initialCursor: string | null;
  filters: AuditFilters;
}) {
  const [rows, setRows] = React.useState(initialRows);
  const [cursor, setCursor] = React.useState(initialCursor);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [selected, setSelected] = React.useState<AuditRow | null>(null);

  async function loadMore() {
    if (!cursor) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ cursor });
      for (const [key, value] of Object.entries(filters)) if (value) params.set(key, value);
      const res = await fetch(`/api/audit-log?${params.toString()}`);
      if (!res.ok) throw new Error();
      const page: { rows: AuditRow[]; nextCursor: string | null } = await res.json();
      setRows((current) => [...current, ...page.rows]);
      setCursor(page.nextCursor);
    } catch {
      setError("Couldn't load more entries. Try again.");
    } finally {
      setLoading(false);
    }
  }

  if (rows.length === 0) {
    return <p className="px-4 sm:px-6 lg:px-10 py-12 text-sm text-ink-muted text-center">No activity matches these filters.</p>;
  }

  return (
    <div className="px-4 sm:px-6 lg:px-10 py-6 space-y-4">
      <div className="border border-rule bg-surface rounded-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-rule text-left text-[11px] uppercase tracking-[0.1em] text-ink-muted">
              <th className="px-4 py-3 font-normal whitespace-nowrap">Time</th>
              <th className="px-4 py-3 font-normal">Event</th>
              <th className="px-4 py-3 font-normal">Status</th>
              <th className="px-4 py-3 font-normal whitespace-nowrap">Code</th>
              <th className="px-4 py-3 font-normal text-right">Response</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-rule">
            {rows.map((row) => (
              <tr key={row.id}>
                <td className="px-4 py-3 whitespace-nowrap text-ink-muted">{formatDateTime(row.createdAt)}</td>
                <td className="px-4 py-3 font-mono text-xs whitespace-nowrap">{row.event}</td>
                <td className="px-4 py-3">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 whitespace-nowrap",
                      row.success ? "text-credit" : "text-debit"
                    )}
                  >
                    {row.success ? <CheckCircle2 className="size-4" /> : <XCircle className="size-4" />}
                    {row.success ? "Success" : "Failed"}
                  </span>
                </td>
                <td className="px-4 py-3 font-mono text-xs">{row.statusCode}</td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => setSelected(row)} className="text-xs text-accent hover:underline">
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {error && <p className="text-sm text-debit text-center">{error}</p>}
      {cursor && (
        <div className="flex justify-center">
          <Button variant="outline" onClick={loadMore} disabled={loading}>
            {loading ? "Loading…" : "Load more"}
          </Button>
        </div>
      )}

      <ResponsePanel row={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

const STATUS_TEXT: Record<number, string> = {
  200: "OK",
  201: "Created",
  204: "No Content",
  400: "Bad Request",
  401: "Unauthorized",
  403: "Forbidden",
  404: "Not Found",
  409: "Conflict",
  500: "Internal Server Error",
};

// What the panel shows and Copy copies: the request details, then the exact
// response body the user received.
function panelJson(row: AuditRow) {
  return JSON.stringify(
    {
      request: {
        url: row.path,
        method: row.method,
        statusCode: row.statusCode,
        status: STATUS_TEXT[row.statusCode] ?? (row.success ? "Success" : "Failed"),
        ipAddress: row.ipAddress,
        userAgent: row.userAgent,
      },
      response: row.response,
    },
    null,
    2
  );
}

function ResponsePanel({ row, onClose }: { row: AuditRow | null; onClose: () => void }) {
  const [copied, setCopied] = React.useState(false);
  const json = row ? panelJson(row) : "";

  async function copy() {
    await navigator.clipboard.writeText(json);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <Dialog open={row !== null} onOpenChange={(open) => !open && onClose()}>
      {/* Restyles the centred dialog as a panel docked to the right edge. */}
      <DialogContent className="left-auto right-0 top-0 h-dvh max-h-none w-full max-w-lg translate-x-0 translate-y-0 rounded-none border-y-0 border-r-0 flex flex-col">
        <DialogHeader>
          <DialogTitle>Request &amp; response</DialogTitle>
          {row && (
            <p className="text-xs text-ink-muted mt-1">
              <span className="font-mono">{row.event}</span> · {row.statusCode} · {formatDateTime(row.createdAt)}
            </p>
          )}
        </DialogHeader>
        <pre className="flex-1 overflow-auto rounded-sm border border-rule bg-paper p-4 text-xs font-mono whitespace-pre-wrap break-all">
          {json}
        </pre>
        <div className="mt-4 flex justify-end">
          <Button variant="outline" size="sm" onClick={copy}>
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
