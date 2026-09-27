import { PageHeader } from "@/components/page-header";
import { db } from "@/lib/db";
import { getCurrentUserId } from "@/lib/session";
import { SavingList, type SavingCardData } from "@/components/savings/saving-list";
import { SavingFormDialog } from "@/components/savings/saving-form-dialog";
import type { AccountRecord, SavingWithAllocations } from "@/lib/types";

// Balances must always reflect the latest write — never statically cached.
export const dynamic = "force-dynamic";

export default async function SavingsPage() {
  const userId = await getCurrentUserId();

  const [accounts, savings]: [AccountRecord[], SavingWithAllocations[]] = await Promise.all([
    db.account.findMany({ where: { userId, isArchived: false }, orderBy: { createdAt: "asc" } }),
    db.saving.findMany({
      where: { userId },
      include: {
        savingTransactions: {
          include: { account: { select: { id: true, name: true } } },
          orderBy: { date: "desc" },
          take: 3,
        },
      },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const accountOptions = accounts.map((a) => ({ id: a.id, name: a.name }));

  const cards: SavingCardData[] = savings.map((s) => ({
    id: s.id,
    name: s.name,
    targetAmount: Number(s.targetAmount),
    currentAmount: Number(s.currentAmount),
    targetDate: s.targetDate ? s.targetDate.toISOString().slice(0, 10) : null,
    status: s.status,
    recentAllocations: s.savingTransactions.map((t) => ({
      id: t.id,
      amount: Number(t.amount),
      date: t.date.toISOString(),
      description: t.description ?? "",
      accountName: t.account.name,
    })),
  }));

  return (
    <>
      <PageHeader eyebrow="Goals" title="Savings" action={<SavingFormDialog mode="create" />} />
      <SavingList savings={cards} accounts={accountOptions} />
    </>
  );
}
