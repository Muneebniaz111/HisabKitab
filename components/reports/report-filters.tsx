"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

export function MonthPicker({ month }: { month: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return (
    <input
      type="month"
      value={month}
      onChange={(e) => {
        const params = new URLSearchParams(searchParams.toString());
        if (e.target.value) params.set("month", e.target.value);
        else params.delete("month");
        router.push(`${pathname}?${params.toString()}`);
      }}
      className="h-10 rounded-sm border border-rule bg-paper px-3 text-sm text-ink focus:outline-none focus:ring-1 focus:ring-accent"
    />
  );
}

export function AccountPicker({
  accountId,
  accounts,
  allowAll = false,
}: {
  accountId: string;
  accounts: { id: string; name: string }[];
  /** Category Breakdown wants "All accounts" as a real option; Account
   *  Statement doesn't (a statement is inherently single-account). */
  allowAll?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return (
    <Select
      value={accountId}
      onValueChange={(v) => {
        const params = new URLSearchParams(searchParams.toString());
        if (v === "ALL") params.delete("accountId");
        else params.set("accountId", v);
        router.push(`${pathname}?${params.toString()}`);
      }}
    >
      <SelectTrigger className="w-48">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {allowAll && <SelectItem value="ALL">All accounts</SelectItem>}
        {accounts.map((a) => (
          <SelectItem key={a.id} value={a.id}>
            {a.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
