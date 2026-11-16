import Link from "next/link";
import { Wallet, BarChart3, PiggyBank, Scale, Lightbulb, Target, TrendingUp } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Amount } from "@/components/ui/amount";
import { db } from "@/lib/db";
import { getCurrentUserId } from "@/lib/session";
import { recentMonths } from "@/lib/date-range";
import { categoryBreakdown } from "@/lib/calculations";
import { buildInsights, type Line } from "@/lib/smartspend";
import { QuoteBanner } from "@/components/smartspend/quote-banner";
import { cn } from "@/lib/utils";
import { sumMoney } from "@/lib/money";
import { formatDate } from "@/lib/dates";

export const dynamic = "force-dynamic";

const HISTORY_MONTHS = 3; // "usual" spending = average of the previous 3 months

export default async function SmartSpendPage() {
  const userId = await getCurrentUserId();
  const months = recentMonths(HISTORY_MONTHS + 1);
  const current = months[months.length - 1];

  const [txns, balanceAgg, savedAgg, savings] = await Promise.all([
    db.transaction.findMany({
      where: { userId, type: { in: ["INCOME", "EXPENSE"] }, date: { gte: months[0].start, lt: current.end } },
      select: { type: true, amount: true, date: true, category: { select: { name: true } } },
    }),
    db.account.aggregate({ where: { userId, isArchived: false }, _sum: { currentBalance: true } }),
    db.savingTransaction.aggregate({
      where: { saving: { userId }, date: { gte: current.start, lt: current.end } },
      _sum: { amount: true },
    }),
    db.saving.findMany({ where: { userId, status: "ACTIVE" }, orderBy: { createdAt: "asc" } }),
  ]);

  const rows = txns.map((t) => ({
    type: t.type,
    amount: t.amount.toNumber(),
    categoryName: t.category?.name ?? null,
    isCurrent: t.date >= current.start,
  }));
  const thisMonth = rows.filter((r) => r.isCurrent);
  const earlier = rows.filter((r) => !r.isCurrent);
  const total = (list: typeof rows, type: string) => sumMoney(list.filter((r) => r.type === type).map((r) => r.amount));
  // Average only over months that actually have entries, so a new user's empty history doesn't drag it down.
  const pastMonths = new Set(txns.filter((t) => t.date < current.start).map((t) => t.date.toISOString().slice(0, 7))).size || 1;
  const avgByCategory: Record<string, number> = {};
  for (const r of earlier) {
    if (r.type === "EXPENSE") avgByCategory[r.categoryName ?? "Uncategorized"] = (avgByCategory[r.categoryName ?? "Uncategorized"] ?? 0) + r.amount / pastMonths;
  }

  const input = {
    income: total(thisMonth, "INCOME"),
    salary: sumMoney(thisMonth.filter((r) => r.type === "INCOME" && /salary/i.test(r.categoryName ?? "")).map((r) => r.amount)),
    expenses: total(thisMonth, "EXPENSE"),
    saved: Number(savedAgg._sum.amount ?? 0),
    balance: Number(balanceAgg._sum.currentBalance ?? 0),
    categories: categoryBreakdown(thisMonth, "EXPENSE"),
    avgByCategory,
    avgIncome: total(earlier, "INCOME") / pastMonths,
    avgExpenses: total(earlier, "EXPENSE") / pastMonths,
    goals: savings.map((s) => ({
      id: s.id,
      name: s.name,
      target: s.targetAmount.toNumber(),
      current: s.currentAmount.toNumber(),
      targetDate: s.targetDate,
    })),
  };
  const insights = buildInsights(input);
  const risingNames = new Set(insights.rising.map((c) => c.category));

  return (
    <>
      <PageHeader eyebrow={current.label} title="SmartSpend" />

      <div className="px-4 sm:px-6 lg:px-10 py-6 sm:py-8 space-y-6 sm:space-y-8">
        <QuoteBanner />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Tile icon={Wallet} label="Income (this month)" value={input.income} tone="text-credit">
            {input.salary > 0 && <Sub label="Salary" value={input.salary} />}
            <Sub label="Available balance" value={input.balance} />
          </Tile>
          <Tile icon={BarChart3} label="Expenses (this month)" value={input.expenses} tone="text-debit">
            {input.categories[0] && <p className="truncate">Most on {input.categories[0].category} ({input.categories[0].percent}%)</p>}
            {input.avgExpenses > 0 && <Sub label="Usual month" value={input.avgExpenses} />}
          </Tile>
          <Tile icon={PiggyBank} label="Saved (this month)" value={input.saved} tone="text-accent">
            {insights.savingsTarget > 0 && (
              <>
                <Sub label="Target (20%)" value={insights.savingsTarget} />
                <Bar percent={(input.saved / insights.savingsTarget) * 100} className="bg-accent" />
              </>
            )}
          </Tile>
          <Tile icon={Scale} label="Left this month" value={insights.left} tone={insights.left < 0 ? "text-debit" : "text-ink"}>
            <p>Income − expenses − savings</p>
          </Tile>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <section className="lg:col-span-3 border border-rule rounded-sm">
            <Heading icon={Lightbulb}>Advice for you</Heading>
            <ul className="divide-y divide-rule/60">
              {insights.advice.map((line, i) => (
                <li key={i} className="px-6 py-3 text-sm leading-relaxed">
                  <LineText line={line} />
                </li>
              ))}
            </ul>
          </section>

          <section className="lg:col-span-2 border border-rule rounded-sm">
            <Heading icon={BarChart3}>Where your money goes</Heading>
            {input.categories.length === 0 ? (
              <p className="px-6 pb-5 text-sm text-ink-muted">No expenses recorded this month.</p>
            ) : (
              <div className="px-6 pb-5 space-y-3">
                {input.categories.slice(0, 5).map((c) => (
                  <div key={c.category}>
                    <div className="flex items-center justify-between gap-3 text-sm mb-1">
                      <span className="flex items-center gap-1.5 min-w-0">
                        <span className="truncate">{c.category}</span>
                        {risingNames.has(c.category) && (
                          <span className="inline-flex items-center gap-0.5 text-[11px] text-debit shrink-0">
                            <TrendingUp className="size-3" strokeWidth={2} />
                            rising
                          </span>
                        )}
                      </span>
                      <span className="inline-flex min-w-0 items-center gap-1 shrink-0 text-ink-muted">
                        <Amount value={c.amount} className="ledger-amount" />
                        <span>· {c.percent}%</span>
                      </span>
                    </div>
                    <Bar percent={c.percent} className={risingNames.has(c.category) ? "bg-debit" : "bg-accent"} />
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <section className="border border-rule rounded-sm">
          <div className="flex items-center justify-between pr-6">
            <Heading icon={Target}>Savings goals</Heading>
            <Link href="/savings" className="text-xs text-accent hover:underline">
              Manage goals
            </Link>
          </div>
          {insights.goals.length > 0 ? (
            <div className="divide-y divide-rule/60">
              {insights.goals.map((g) => (
                <div key={g.id} className="px-6 py-4 space-y-2">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="truncate">{g.name}</span>
                    <span className="text-ink-muted shrink-0">{g.progress}%</span>
                  </div>
                  <Bar percent={g.progress} className="bg-accent" />
                  <p className="text-xs text-ink-muted leading-relaxed">
                    {g.monthly > 0 ? (
                      <LineText
                        line={[
                          "Save ",
                          { amount: g.monthly },
                          g.deadline
                            ? ` a month to reach it by ${formatDate(g.deadline, { month: "short", year: "numeric" })}.`
                            : ` a month to reach it in about ${g.monthsToGo} month${g.monthsToGo === 1 ? "" : "s"}.`,
                        ]}
                      />
                    ) : (
                      "Record some income to get a monthly savings suggestion for this goal."
                    )}
                    {g.stretch && insights.surplus > 0 && (
                      <span className="text-debit">
                        {" "}
                        That&apos;s more than your usual surplus of <Amount value={insights.surplus} className="ledger-amount" /> — consider a later date.
                      </span>
                    )}
                  </p>
                </div>
              ))}
            </div>
          ) : insights.emergencyFund ? (
            <p className="px-6 pb-5 text-sm leading-relaxed">
              <LineText
                line={[
                  "Start with an emergency fund of ",
                  { amount: insights.emergencyFund },
                  " (three months of expenses). Saving ",
                  { amount: insights.savingsTarget || insights.surplus },
                  " a month gets you there steadily.",
                ]}
              />
            </p>
          ) : (
            <p className="px-6 pb-5 text-sm text-ink-muted">Record income and expenses to get a goal suggestion.</p>
          )}
        </section>
      </div>
    </>
  );
}

type Icon = React.ComponentType<{ className?: string; strokeWidth?: number }>;

function Tile({ icon: Icon, label, value, tone, children }: { icon: Icon; label: string; value: number; tone: string; children?: React.ReactNode }) {
  return (
    <div className="min-w-0 border border-rule rounded-sm px-5 py-5">
      <p className="flex items-center gap-1.5 text-xs uppercase tracking-[0.14em] text-ink-muted mb-2">
        <Icon className="size-3.5 shrink-0" strokeWidth={1.75} />
        <span className="truncate">{label}</span>
      </p>
      <Amount value={value} className={cn("ledger-amount font-display text-2xl", tone)} />
      <div className="mt-2 space-y-1 text-xs text-ink-muted">{children}</div>
    </div>
  );
}

function Sub({ label, value }: { label: string; value: number }) {
  return (
    <p className="flex items-center justify-between gap-2">
      <span className="truncate">{label}</span>
      <Amount value={value} className="ledger-amount" />
    </p>
  );
}

function Heading({ icon: Icon, children }: { icon: Icon; children: React.ReactNode }) {
  return (
    <p className="flex items-center gap-1.5 text-xs uppercase tracking-[0.14em] text-ink-muted px-6 pt-5 pb-3">
      <Icon className="size-3.5" strokeWidth={1.75} />
      {children}
    </p>
  );
}

function Bar({ percent, className }: { percent: number; className: string }) {
  return (
    <div className="h-1.5 rounded-full bg-accent-surface overflow-hidden">
      <div className={cn("h-full rounded-full", className)} style={{ width: `${Math.min(100, Math.max(0, percent))}%` }} />
    </div>
  );
}

function LineText({ line }: { line: Line }) {
  return line.map((part, i) =>
    typeof part === "string" ? part : <Amount key={i} value={part.amount} className="ledger-amount" />
  );
}
