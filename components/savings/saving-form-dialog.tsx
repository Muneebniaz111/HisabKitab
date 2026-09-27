"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { SAVING_STATUSES } from "@/lib/validations/saving";

type SavingStatus = (typeof SAVING_STATUSES)[number];

const STATUS_LABELS: Record<SavingStatus, string> = {
  ACTIVE: "Active",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

type Props =
  | { mode: "create" }
  | {
      mode: "edit";
      saving: {
        id: string;
        name: string;
        targetAmount: number;
        targetDate: string | null; // "YYYY-MM-DD"
        status: SavingStatus;
      };
    };

export function SavingFormDialog(props: Props) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const initial = props.mode === "edit" ? props.saving : null;

  const [name, setName] = React.useState(initial?.name ?? "");
  const [targetAmount, setTargetAmount] = React.useState(initial ? String(initial.targetAmount) : "");
  const [targetDate, setTargetDate] = React.useState(initial?.targetDate ?? "");
  const [status, setStatus] = React.useState<SavingStatus>(initial?.status ?? "ACTIVE");
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const payload =
        props.mode === "create"
          ? { name, targetAmount, targetDate: targetDate || null }
          : { name, targetAmount, targetDate: targetDate || null, status };

      const res = await fetch(props.mode === "create" ? "/api/savings" : `/api/savings/${props.saving.id}`, {
        method: props.mode === "create" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(body?.error?.formErrors?.[0] ?? body?.error ?? "Please check the fields below.");
        return;
      }

      setOpen(false);
      if (props.mode === "create") {
        setName("");
        setTargetAmount("");
        setTargetDate("");
      }
      router.refresh();
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {props.mode === "create" ? (
          <Button>
            <Plus className="size-4" strokeWidth={2} />
            Add Goal
          </Button>
        ) : (
          <Button variant="ghost" size="icon" aria-label="Edit goal">
            <Pencil className="size-4" strokeWidth={1.75} />
          </Button>
        )}
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>{props.mode === "create" ? "Add Savings Goal" : "Edit Savings Goal"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="New Laptop"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="targetAmount">Target Amount</Label>
              <Input
                id="targetAmount"
                type="number"
                min="0.01"
                step="0.01"
                inputMode="decimal"
                value={targetAmount}
                onChange={(e) => setTargetAmount(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="targetDate">Target Date</Label>
              <Input
                id="targetDate"
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
              />
            </div>
          </div>

          {props.mode === "edit" && (
            <div className="space-y-1.5">
              <Label htmlFor="status">Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as SavingStatus)}>
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SAVING_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {STATUS_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {props.mode === "edit" && (
            <p className="text-xs text-ink-muted">
              Current amount isn&apos;t editable here — use Add Funds / Withdraw so the account
              ledger stays accurate.
            </p>
          )}

          {error && <p className="text-sm text-debit">{error}</p>}

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? "Saving…" : props.mode === "create" ? "Add Goal" : "Save Changes"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
