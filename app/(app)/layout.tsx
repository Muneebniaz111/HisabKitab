import { getCurrentUser } from "@/lib/session";
import { Sidebar } from "@/components/app-shell/sidebar";
import { IdleLogout } from "@/components/auth/idle-logout";
import { IDLE_TIMEOUT_MS } from "@/lib/idle-session";
import { HelpButton } from "@/components/help/help-button";
import { DueRecurringPrompt } from "@/components/recurring/due-recurring-prompt";
import { findUnpromptedDueRules } from "@/lib/recurring";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/dates";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  const [due] = user ? await findUnpromptedDueRules(user.id) : [];
  // Only needed for the prompt's account picker, so skipped when nothing is due.
  const accounts = due
    ? await db.account.findMany({
        where: { userId: due.userId, isArchived: false },
        select: { id: true, name: true },
        orderBy: { createdAt: "asc" },
      })
    : [];

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-paper text-ink">
      <IdleLogout timeoutMs={IDLE_TIMEOUT_MS} />
      <DueRecurringPrompt
        key={due?.id}
        accounts={accounts}
        due={
          due
            ? {
                id: due.id,
                label: due.description || due.category?.name || "",
                type: due.type as "INCOME" | "EXPENSE",
                amount: due.amount.toNumber(),
                accountId: due.accountId,
                dueDate: formatDate(due.nextRunDate, { day: "numeric", month: "short", year: "numeric" }),
              }
            : null
        }
      />
      <Sidebar userEmail={user?.email} />
      <main className="flex-1 min-w-0">{children}</main>
      <HelpButton />
    </div>
  );
}
