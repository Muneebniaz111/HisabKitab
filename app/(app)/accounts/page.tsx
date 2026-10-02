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

  const accounts: AccountRecord[] = (await db.account.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
  })).map((a) => ({
    ...a,
    openingBalance: a.openingBalance.toNumber(),
    currentBalance: a.currentBalance.toNumber(),
  }));

  const rows: AccountRow[] = accounts.map((a) => ({
    id: a.id,
    name: a.name,
    type: a.type,
    openingBalance: a.openingBalance,
    currentBalance: a.currentBalance,
    isArchived: a.isArchived,
  }));

  return (
    <>
      <PageHeader eyebrow="Wallets" title="Accounts" action={<AccountFormDialog mode="create" />} />
      <AccountList accounts={rows} />
    </>
  );
}
