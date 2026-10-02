import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { db } from "@/lib/db";
import { getCurrentUserId } from "@/lib/session";
import { ensureDefaultCategories } from "@/lib/categories";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { CategoryManager } from "@/components/settings/category-manager";
import { RecurringFormDialog } from "@/components/recurring/recurring-form-dialog";
import { RecurringList, type RecurringRow } from "@/components/recurring/recurring-list";
import { Wallet } from "lucide-react";
import type { AccountRecord, CategoryRecord, RecurringWithRelations } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const userId = await getCurrentUserId();
  await ensureDefaultCategories(userId);

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [accounts, categories, recurringRules]: [AccountRecord[], CategoryRecord[], RecurringWithRelations[]] =
    await Promise.all([
      db.account
        .findMany({ where: { userId, isArchived: false }, orderBy: { createdAt: "asc" } })
        .then((rows) =>
          rows.map((a) => ({
            ...a,
            openingBalance: a.openingBalance.toNumber(),
            currentBalance: a.currentBalance.toNumber(),
          }))
        ),
      db.category.findMany({ where: { userId }, orderBy: { name: "asc" } }),
      db.recurringTransaction.findMany({
        where: { userId },
        include: {
          account: { select: { id: true, name: true } },
          category: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "asc" },
      }).then((rows) =>
        rows
          .filter((r) => r.type !== "TRANSFER")
          .map((r) => ({
            ...r,
            type: r.type as RecurringWithRelations["type"],
            amount: r.amount.toNumber(),
          }))
      ),
    ]);

  const accountOptions = accounts.map((a) => ({ id: a.id, name: a.name }));
  const incomeCategories = categories.filter((c) => c.kind === "INCOME").map((c) => ({ id: c.id, name: c.name }));
  const expenseCategories = categories.filter((c) => c.kind === "EXPENSE").map((c) => ({ id: c.id, name: c.name }));

  const recurringRows: RecurringRow[] = recurringRules.map((r) => ({
    id: r.id,
    type: r.type,
    amount: r.amount,
    description: r.description ?? "",
    accountName: r.account.name,
    categoryName: r.category?.name ?? "—",
    frequency: r.frequency,
    dayOfMonth: r.dayOfMonth,
    nextRunDate: r.nextRunDate.toISOString(),
    isActive: r.isActive,
    accountId: r.accountId,
    categoryId: r.categoryId ?? "",
  }));

  return (
    <>
      <PageHeader eyebrow="Configuration" title="Settings" />

      <div className="px-4 sm:px-6 lg:px-10 py-6 sm:py-8 space-y-8 sm:space-y-10">
        {/* Profile */}
        <section>
          <p className="text-xs uppercase tracking-[0.14em] text-ink-muted mb-3">Profile</p>
          <div className="border border-rule rounded-sm px-4 sm:px-6 py-4 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm truncate">{user?.email}</p>
              <p className="text-xs text-ink-muted mt-0.5">Signed in via Supabase Auth</p>
            </div>
          </div>
        </section>

        {/* Accounts */}
        <section>
          <p className="text-xs uppercase tracking-[0.14em] text-ink-muted mb-3">Accounts</p>
          <Link
            href="/accounts"
            className="flex items-center justify-between gap-3 border border-rule rounded-sm px-4 sm:px-6 py-4 hover:bg-surface transition-colors"
          >
            <span className="flex items-center gap-3 text-sm min-w-0">
              <Wallet className="size-[18px] text-ink-muted shrink-0" strokeWidth={1.75} />
              <span className="truncate">Manage accounts — add, edit, or archive</span>
            </span>
            <span className="text-xs text-ink-muted shrink-0">{accounts.length} active</span>
          </Link>
        </section>

        {/* Categories */}
        <section>
          <p className="text-xs uppercase tracking-[0.14em] text-ink-muted mb-3">Categories</p>
          <CategoryManager incomeCategories={incomeCategories} expenseCategories={expenseCategories} />
        </section>

        {/* Recurring transactions */}
        <section>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <p className="text-xs uppercase tracking-[0.14em] text-ink-muted">Recurring Transactions</p>
            <RecurringFormDialog
              mode="create"
              accounts={accountOptions}
              incomeCategories={incomeCategories}
              expenseCategories={expenseCategories}
            />
          </div>
          <RecurringList
            rules={recurringRows}
            accounts={accountOptions}
            incomeCategories={incomeCategories}
            expenseCategories={expenseCategories}
          />
        </section>
      </div>
    </>
  );
}
