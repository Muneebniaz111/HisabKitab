import { PageHeader } from "@/components/page-header";
import { getCurrentUserId } from "@/lib/session";
import { getAccounts } from "@/lib/accounts";
import { AccountList, type AccountRow } from "@/components/accounts/account-list";
import { AccountFormDialog } from "@/components/accounts/account-form-dialog";

// Balances must always reflect the latest write — never statically cached.
export const dynamic = "force-dynamic";

export default async function AccountsPage() {
  const userId = await getCurrentUserId();

  const accounts = await getAccounts(userId, { includeArchived: true });

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
