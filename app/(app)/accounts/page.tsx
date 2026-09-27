import { PageHeader } from "@/components/page-header";
import { db } from "@/lib/db";
import { getCurrentUserId } from "@/lib/session";
import { AccountList, type AccountRow } from "@/components/accounts/account-list";
import { AccountFormDialog } from "@/components/accounts/account-form-dialog";
import type { AccountRecord } from "@/lib/types";

// Balances must always reflect the latest write — never statically cached.
export const dynamic = "force-dynamic";

export default async function AccountsPage() {
  const userId = await getCurrentUserId();

  const accounts: AccountRecord[] = await db.account.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
  });

  // Prisma's Decimal isn't serializable across the server/client boundary —
  // convert once here rather than in every consumer.
  const rows: AccountRow[] = accounts.map((a) => ({
    id: a.id,
    name: a.name,
    type: a.type,
    openingBalance: Number(a.openingBalance),
    currentBalance: Number(a.currentBalance),
    isArchived: a.isArchived,
  }));

  return (
    <>
      <PageHeader eyebrow="Wallets" title="Accounts" action={<AccountFormDialog mode="create" />} />
      <AccountList accounts={rows} />
    </>
  );
}
