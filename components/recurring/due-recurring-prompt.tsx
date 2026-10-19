"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { formatCurrency } from "@/lib/utils";

export type DueOccurrence = {
  id: string;
  label: string;
  type: "INCOME" | "EXPENSE";
  amount: number;
  accountId: string;
  dueDate: string;
};

// Asks once per due occurrence. Yes posts it to the chosen account (this
// occurrence only); No (or closing) keeps it pending for manual processing in
// Settings → Recurring and stops asking. With `onClose` (the manual "Deduct
// now" flow) No just cancels. router.refresh() brings the next due one, if any.
export function DueRecurringPrompt({
  due,
  accounts,
  onClose,
}: {
  due: DueOccurrence | null;
  accounts: { id: string; name: string }[];
  onClose?: () => void;
}) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [accountId, setAccountId] = React.useState(due?.accountId ?? "");
  if (!due) return null;

  async function answer(action: "process" | "skip") {
    if (action === "skip" && onClose) return onClose();
    setBusy(true);
    await fetch(`/api/recurring/${due!.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, accountId }),
    });
    setBusy(false);
    onClose?.();
    router.refresh();
  }

  return (
    <Dialog open onOpenChange={(open) => !open && !busy && answer("skip")}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Recurring transaction due</DialogTitle>
        </DialogHeader>
        <p className="text-sm">
          Your recurring transaction <strong>{due.label}</strong> of <strong>{formatCurrency(due.amount)}</strong> was
          due on {due.dueDate}. Do you want to {due.type === "INCOME" ? "add" : "deduct"} it?
        </p>
        <div className="mt-4 space-y-1.5">
          <Label htmlFor="dueAccountId">{due.type === "INCOME" ? "Add to account" : "Deduct from account"}</Label>
          <Select value={accountId} onValueChange={setAccountId}>
            <SelectTrigger id="dueAccountId">
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
        <div className="mt-5 grid grid-cols-2 gap-3">
          <Button variant="outline" disabled={busy} onClick={() => answer("skip")}>
            No
          </Button>
          <Button disabled={busy} onClick={() => answer("process")}>
            Yes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
