"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { cn } from "@/lib/utils";

type Direction = "ALLOCATE" | "WITHDRAW";

const TODAY = () => new Date().toISOString().slice(0, 10);

export function SavingAllocateDialog({
  savingId,
  savingName,
  accounts,
  defaultDirection = "ALLOCATE",
}: {
  savingId: string;
  savingName: string;
  accounts: { id: string; name: string }[];
  defaultDirection?: Direction;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [direction, setDirection] = React.useState<Direction>(defaultDirection);
  const [accountId, setAccountId] = React.useState(accounts[0]?.id ?? "");
  const [amount, setAmount] = React.useState("");
  const [date, setDate] = React.useState(TODAY());
  const [description, setDescription] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch(`/api/savings/${savingId}/allocations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ direction, accountId, amount, date, description }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(body?.error?.formErrors?.[0] ?? body?.error ?? "Please check the fields below.");
        return;
      }

      setOpen(false);
      setAmount("");
      setDescription("");
      router.refresh();
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const noAccounts = accounts.length === 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Add / Withdraw Funds
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>{savingName}</DialogTitle>
        </DialogHeader>

        {noAccounts ? (
          <p className="text-sm text-ink-muted">Add an account first to move money to or from this goal.</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-1 rounded-sm border border-rule p-1">
              <button
                type="button"
                onClick={() => setDirection("ALLOCATE")}
                className={cn(
                  "flex items-center justify-center gap-1.5 rounded-sm py-1.5 text-sm transition-colors",
                  direction === "ALLOCATE" ? "bg-ink text-paper" : "text-ink-muted hover:text-ink"
                )}
              >
                <ArrowDownToLine className="size-3.5" strokeWidth={2} />
                Add Funds
              </button>
              <button
                type="button"
                onClick={() => setDirection("WITHDRAW")}
                className={cn(
                  "flex items-center justify-center gap-1.5 rounded-sm py-1.5 text-sm transition-colors",
                  direction === "WITHDRAW" ? "bg-ink text-paper" : "text-ink-muted hover:text-ink"
                )}
              >
                <ArrowUpFromLine className="size-3.5" strokeWidth={2} />
                Withdraw
              </button>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="accountId">{direction === "ALLOCATE" ? "From Account" : "To Account"}</Label>
              <Select value={accountId} onValueChange={setAccountId}>
                <SelectTrigger id="accountId">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="amount">Amount</Label>
                <Input
                  id="amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="date">Date</Label>
                <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional"
              />
            </div>

            {error && <p className="text-sm text-debit">{error}</p>}

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "Saving…" : direction === "ALLOCATE" ? "Add Funds" : "Withdraw"}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
