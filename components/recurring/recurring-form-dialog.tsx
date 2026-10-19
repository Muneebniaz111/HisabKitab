"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { RECURRENCE_FREQUENCIES, FREQUENCY_LABELS } from "@/lib/validations/recurring";
import { apiErrorMessage } from "@/lib/utils";

type Option = { id: string; name: string };
type Frequency = (typeof RECURRENCE_FREQUENCIES)[number];
type TxType = "INCOME" | "EXPENSE";

const ordinal = (n: number) => n + (["th", "st", "nd", "rd"][((n % 100) - 20) % 10] || ["th", "st", "nd", "rd"][n % 100] || "th");

// Plain-language summary under the date, e.g. "Repeats every month on the 19th, starting 19 Oct 2026."
function scheduleSummary(frequency: Frequency, isoDate: string) {
  const date = new Date(`${isoDate}T00:00:00Z`);
  if (isNaN(date.getTime())) return "";
  const fmt = (o: Intl.DateTimeFormatOptions) => date.toLocaleDateString("en-GB", { timeZone: "UTC", ...o });
  const when = {
    DAILY: "every day",
    WEEKLY: `every week on ${fmt({ weekday: "long" })}`,
    MONTHLY: `every month on the ${ordinal(date.getUTCDate())}${date.getUTCDate() > 28 ? " (or the month's last day)" : ""}`,
    YEARLY: `every year on ${fmt({ day: "numeric", month: "short" })}`,
  }[frequency];
  return `Repeats ${when}, starting ${fmt({ day: "numeric", month: "short", year: "numeric" })}.`;
}

export type RecurringFormValues = {
  id: string;
  type: TxType;
  accountId: string;
  categoryId: string;
  amount: number;
  description: string;
  frequency: Frequency;
  isActive: boolean;
};

type Props = {
  accounts: Option[];
  incomeCategories: Option[];
  expenseCategories: Option[];
} & ({ mode: "create" } | { mode: "edit"; rule: RecurringFormValues });

const TODAY = () => new Date().toISOString().slice(0, 10);

export function RecurringFormDialog(props: Props) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const isEdit = props.mode === "edit";
  const initial = isEdit ? props.rule : null;

  const [type, setType] = React.useState<TxType>(initial?.type ?? "EXPENSE");
  const [accountId, setAccountId] = React.useState(initial?.accountId ?? props.accounts[0]?.id ?? "");
  // A lazy initializer, not `initial?.categoryId ?? ""`: on create, `type`
  // defaults to "EXPENSE" already selected in the toggle above, so without
  // a real default here, categoryId would sit at "" — matching no item in
  // the list — until the user actively clicked the type toggle. The Select
  // would render with no valid selection: exactly the "not displaying
  // correctly" bug.
  const [categoryId, setCategoryId] = React.useState(() => {
    if (initial?.categoryId) return initial.categoryId;
    const opts = type === "INCOME" ? props.incomeCategories : props.expenseCategories;
    return opts[0]?.id ?? "";
  });
  const [amount, setAmount] = React.useState(initial ? String(initial.amount) : "");
  const [description, setDescription] = React.useState(initial?.description ?? "");
  const [frequency, setFrequency] = React.useState<Frequency>(initial?.frequency ?? "MONTHLY");
  const [startDate, setStartDate] = React.useState(TODAY());
  const [isActive, setIsActive] = React.useState(initial?.isActive ?? true);
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  const categoryOptions = type === "INCOME" ? props.incomeCategories : props.expenseCategories;

  function handleTypeChange(newType: TxType) {
    setType(newType);
    const opts = newType === "INCOME" ? props.incomeCategories : props.expenseCategories;
    setCategoryId((prev) => (opts.some((c) => c.id === prev) ? prev : opts[0]?.id ?? ""));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      // No dayOfMonth: on create the server takes it from startDate; on edit the rule keeps its own.
      const payload = isEdit
        ? { type, accountId, categoryId, amount, description, frequency, isActive }
        : { type, accountId, categoryId, amount, description, frequency, startDate };

      const res = await fetch(isEdit ? `/api/recurring/${props.rule.id}` : "/api/recurring", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(apiErrorMessage(body, "Please check the fields below."));
        return;
      }

      setOpen(false);
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
          <Button variant="ghost" size="icon" aria-label="Edit recurring rule">
            <Pencil className="size-4" strokeWidth={1.75} />
          </Button>
        ) : (
          <Button>
            <Plus className="size-4" strokeWidth={2} />
            Add Recurring
          </Button>
        )}
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Recurring Transaction" : "Add Recurring Transaction"}</DialogTitle>
        </DialogHeader>

        {noAccounts ? (
          <p className="text-sm text-ink-muted">Add an account first.</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Segmented
              value={type}
              onChange={handleTypeChange}
              options={[
                { value: "EXPENSE", label: "Expense" },
                { value: "INCOME", label: "Income" },
              ]}
            />

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
                <Label htmlFor="frequency">Repeats</Label>
                <Select value={frequency} onValueChange={(v) => setFrequency(v as Frequency)}>
                  <SelectTrigger id="frequency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RECURRENCE_FREQUENCIES.map((f) => (
                      <SelectItem key={f} value={f}>
                        {FREQUENCY_LABELS[f]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {!isEdit && (
              <div className="space-y-1.5">
                <Label htmlFor="startDate">First date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                />
                <p className="text-xs text-ink-muted">{scheduleSummary(frequency, startDate)}</p>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Salary, Netflix"
              />
            </div>

            {isEdit && (
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="size-4"
                />
                Active
              </label>
            )}

            {error && <p className="text-sm text-debit">{error}</p>}

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "Saving…" : isEdit ? "Save Changes" : "Add Recurring"}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
