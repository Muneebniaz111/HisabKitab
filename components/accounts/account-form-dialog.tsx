"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { ACCOUNT_TYPES, ACCOUNT_TYPE_LABELS } from "@/lib/validations/account";

type AccountType = (typeof ACCOUNT_TYPES)[number];

type Props =
  | { mode: "create" }
  | {
      mode: "edit";
      account: { id: string; name: string; type: AccountType };
    };

export function AccountFormDialog(props: Props) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState(props.mode === "edit" ? props.account.name : "");
  const [type, setType] = React.useState<AccountType>(
    props.mode === "edit" ? props.account.type : "BANK"
  );
  const [openingBalance, setOpeningBalance] = React.useState("0");
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const res =
        props.mode === "create"
          ? await fetch("/api/accounts", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ name, type, openingBalance }),
            })
          : await fetch(`/api/accounts/${props.account.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ name, type }),
            });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(body?.error?.fieldErrors ? "Please check the fields below." : "Something went wrong. Try again.");
        return;
      }

      setOpen(false);
      if (props.mode === "create") {
        setName("");
        setOpeningBalance("0");
        setType("BANK");
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
            Add Account
          </Button>
        ) : (
          <Button variant="ghost" size="icon" aria-label="Edit account">
            <Pencil className="size-4" strokeWidth={1.75} />
          </Button>
        )}
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>{props.mode === "create" ? "Add Account" : "Edit Account"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Meezan Bank"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="type">Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as AccountType)}>
              <SelectTrigger id="type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ACCOUNT_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {ACCOUNT_TYPE_LABELS[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {props.mode === "create" && (
            <div className="space-y-1.5">
              <Label htmlFor="openingBalance">Opening Balance</Label>
              <Input
                id="openingBalance"
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                value={openingBalance}
                onChange={(e) => setOpeningBalance(e.target.value)}
                required
              />
            </div>
          )}

          {props.mode === "edit" && (
            <p className="text-xs text-ink-muted">
              Opening balance can&apos;t be edited once an account exists — correct the balance
              with a transaction instead, so the ledger stays accurate.
            </p>
          )}

          {error && <p className="text-sm text-debit">{error}</p>}

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? "Saving…" : props.mode === "create" ? "Add Account" : "Save Changes"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
