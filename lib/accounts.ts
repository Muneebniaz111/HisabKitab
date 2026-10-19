import { db } from "@/lib/db";
import type { AccountRecord } from "@/lib/types";

/** The user's accounts, oldest first, with Decimal balances as plain numbers so they can be passed to client components. */
export async function getAccounts(userId: string, { includeArchived = false } = {}): Promise<AccountRecord[]> {
  const rows = await db.account.findMany({
    where: { userId, ...(includeArchived ? {} : { isArchived: false }) },
    orderBy: { createdAt: "asc" },
  });
  return rows.map((a) => ({
    ...a,
    openingBalance: a.openingBalance.toNumber(),
    currentBalance: a.currentBalance.toNumber(),
  }));
}
