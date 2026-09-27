"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export type Option = { id: string; name: string };
export type TxType = "INCOME" | "EXPENSE" | "TRANSFER";

export type TransactionFormValues = {
  id: string;
  type: TxType;
  amount: number;
  date: string; // "YYYY-MM-DD"
  description: string;
  notes: string;
  accountId?: string;
  categoryId?: string;
  fromAccountId?: string;
  toAccountId?: string;
};

type Props = {
  accounts: Option[];
  incomeCategories: Option[];
  expenseCategories: Option[];
} & ({ mode: "create"; defaultType?: TxType } | { mode: "edit"; transaction: TransactionFormValues });

const TODAY = () => new Date().toISOString().slice(0, 10);

export function TransactionFormDialog(props: Props) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const isEdit = props.mode === "edit";
  const initial = isEdit ? props.transaction : null;

  const [type, setType] = React.useState<TxType>(() => {
    if (props.mode === "edit") return props.transaction.type;
    return props.defaultType ?? "EXPENSE";
  });
  const [amount, setAmount] = React.useState(initial ? String(initial.amount) : "");
  const [date, setDate] = React.useState(initial?.date ?? TODAY());
  const [description, setDescription] = React.useState(initial?.description ?? "");
  const [notes, setNotes] = React.useState(initial?.notes ?? "");
  const [accountId, setAccountId] = React.useState(initial?.accountId ?? props.accounts[0]?.id ?? "");
  // Lazy initializer, not `initial?.categoryId ?? ""` — see the identical
  // fix in recurring-form-dialog.tsx for why: without a real default here,
  // creating an Expense (the default-selected type) with categoryId stuck
  // at "" leaves the Select matching no item until the user actively
  // clicks the type toggle.
  const [categoryId, setCategoryId] = React.useState(() => {
    if (initial?.categoryId) return initial.categoryId;
    if (type === "TRANSFER") return "";
    const opts = type === "INCOME" ? props.incomeCategories : props.expenseCategories;
    return opts[0]?.id ?? "";
  });
  const [fromAccountId, setFromAccountId] = React.useState(initial?.fromAccountId ?? props.accounts[0]?.id ?? "");
  const [toAccountId, setToAccountId] = React.useState(initial?.toAccountId ?? props.accounts[1]?.id ?? "");
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  const categoryOptions = type === "INCOME" ? props.incomeCategories : props.expenseCategories;

  function handleTypeChange(newType: TxType) {
    setType(newType);
    if (newType === "TRANSFER") return;
    const opts = newType === "INCOME" ? props.incomeCategories : props.expenseCategories;
    setCategoryId((prev) => (opts.some((c) => c.id === prev) ? prev : opts[0]?.id ?? ""));
  }

  function resetForCreate() {
    setType("EXPENSE");
    setAmount("");
    setDate(TODAY());
    setDescription("");
    setNotes("");
    setAccountId(props.accounts[0]?.id ?? "");
    setCategoryId("");
    setFromAccountId(props.accounts[0]?.id ?? "");
    setToAccountId(props.accounts[1]?.id ?? "");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (type === "TRANSFER" && fromAccountId === toAccountId) {
      setError("From and To accounts must be different.");
      return;
    }

    setSubmitting(true);
    try {
      const payload =
        type === "TRANSFER"
          ? { type, amount, date, description, notes, fromAccountId, toAccountId }
          : { type, amount, date, description, notes, accountId, categoryId };

      const res = await fetch(isEdit ? `/api/transactions/${props.transaction.id}` : "/api/transactions", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(body?.error?.formErrors?.[0] ?? body?.error ?? "Please check the fields below.");
        return;
      }

      setOpen(false);
      if (!isEdit) resetForCreate();
      router.refresh();
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const noAccounts = props.accounts.length === 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {isEdit ? (
          <Button variant="ghost" size="icon" aria-label="Edit transaction">
            <Pencil className="size-4" strokeWidth={1.75} />
          </Button>
        ) : (
          <Button>
            <Plus className="size-4" strokeWidth={2} />
            Add Transaction
          </Button>
        )}
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Transaction" : "Add Transaction"}</DialogTitle>
        </DialogHeader>

        {noAccounts ? (
          <p className="text-sm text-ink-muted">
            Add an account first — a transaction always needs somewhere to post to.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-3 gap-1 rounded-sm border border-rule p-1">
              {(["EXPENSE", "INCOME", "TRANSFER"] as TxType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => handleTypeChange(t)}
                  className={cn(
                    "rounded-sm py-1.5 text-sm capitalize transition-colors",
                    type === t ? "bg-ink text-paper" : "text-ink-muted hover:text-ink"
                  )}
                >
                  {t.toLowerCase()}
                </button>
              ))}
            </div>

            {type === "TRANSFER" ? (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="fromAccountId">From Account</Label>
                  <Select value={fromAccountId} onValueChange={setFromAccountId}>
                    <SelectTrigger id="fromAccountId">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {props.accounts.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="toAccountId">To Account</Label>
                  <Select value={toAccountId} onValueChange={setToAccountId}>
                    <SelectTrigger id="toAccountId">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {props.accounts.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="accountId">Account</Label>
                  <Select value={accountId} onValueChange={setAccountId}>
                    <SelectTrigger id="accountId">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {props.accounts.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="categoryId">Category</Label>
                  <Select value={categoryId} onValueChange={setCategoryId}>
                    <SelectTrigger id="categoryId">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categoryOptions.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

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
                placeholder={type === "TRANSFER" ? "Optional" : "e.g. Grocery run"}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="notes">Notes</Label>
              <Input id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" />
            </div>

            {error && <p className="text-sm text-debit">{error}</p>}

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "Saving…" : isEdit ? "Save Changes" : "Add Transaction"}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
