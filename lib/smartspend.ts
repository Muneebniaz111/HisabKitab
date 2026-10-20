// SmartSpend: rule-based insights from the user's own ledger. Pure — the page
// loads the numbers, this turns them into advice and goal suggestions.

import { sumMoney } from "@/lib/money";

// Text with embedded amounts, so the page can render the amounts through
// <Amount> and keep them hidden-by-default like everywhere else in the app.
export type Line = (string | { amount: number })[];

export type SmartSpendInput = {
  income: number; // this month
  salary: number; // this month, from income categories named like "Salary"
  expenses: number; // this month
  saved: number; // this month, net savings allocations
  balance: number; // across active accounts
  categories: { category: string; amount: number; percent: number }[]; // this month's expenses, largest first
  avgByCategory: Record<string, number>; // typical month (previous months' average)
  avgIncome: number;
  avgExpenses: number;
  goals: { id: string; name: string; target: number; current: number; targetDate: Date | null }[];
};

const SAVINGS_RATE = 0.2; // the "20" in the 50/30/20 budgeting rule
const RISE_THRESHOLD = 1.2; // a category 20%+ above its usual month counts as rising

export function buildInsights(i: SmartSpendInput, now = new Date()) {
  const typicalIncome = i.income || i.avgIncome;
  const savingsTarget = Math.round(typicalIncome * SAVINGS_RATE);
  // What's realistically free to save each month, from typical (or this month's) income and spending.
  const surplus = Math.max(0, Math.round(typicalIncome - (i.avgExpenses || i.expenses)));

  const rising = i.categories
    .map((c) => ({ ...c, usual: i.avgByCategory[c.category] ?? 0 }))
    .filter((c) => c.usual > 0 && c.amount > c.usual * RISE_THRESHOLD);

  const advice: Line[] = [];
  if (!typicalIncome) {
    advice.push(["Record your salary or other income so SmartSpend can size a budget and savings target for you."]);
  }
  if (i.income && i.expenses > i.income) {
    advice.push(["You've spent ", { amount: sumMoney([i.expenses, -i.income]) }, " more than you earned this month. Hold off on non-essential purchases until your next income."]);
  }
  const top = i.categories[0];
  if (top && top.percent >= 30) {
    advice.push([`${top.category} takes ${top.percent}% of your spending. Trimming it by 10% would save `, { amount: Math.round(top.amount * 0.1) }, " a month."]);
  }
  for (const c of rising.slice(0, 2)) {
    advice.push([`${c.category} is at `, { amount: c.amount }, " against a usual ", { amount: Math.round(c.usual) }, ". Look for spending here you can skip."]);
  }
  if (savingsTarget && i.saved < savingsTarget) {
    advice.push(["Aim to save ", { amount: savingsTarget }, " a month (20% of income). Move ", { amount: sumMoney([savingsTarget, -i.saved]) }, " into a goal right after payday so it isn't spent."]);
  }
  if (!advice.length) advice.push(["You're living within your means and meeting your savings target. Keep it up!"]);

  const active = i.goals.filter((g) => g.current < g.target);
  const goals = active.map((g) => {
    const remaining = sumMoney([g.target, -g.current]);
    const monthsLeft = g.targetDate ? Math.max(1, monthsUntil(now, g.targetDate)) : null;
    // With a deadline: what it takes. Without one: an even share of the surplus.
    const monthly = monthsLeft ? Math.ceil(remaining / monthsLeft) : Math.min(remaining, Math.round(surplus / active.length));
    return {
      id: g.id,
      name: g.name,
      remaining,
      progress: Math.round((g.current / g.target) * 100),
      monthly,
      monthsToGo: monthly > 0 ? Math.ceil(remaining / monthly) : null,
      deadline: g.targetDate,
      stretch: monthly > surplus,
    };
  });

  // No goals yet: suggest the classic first one, three months of expenses as a safety net.
  const emergencyFund = !i.goals.length && (i.avgExpenses || i.expenses) > 0 ? Math.round((i.avgExpenses || i.expenses) * 3) : null;

  return { savingsTarget, surplus, left: sumMoney([i.income, -i.expenses, -i.saved]), rising, advice, goals, emergencyFund };
}

function monthsUntil(from: Date, to: Date) {
  return (to.getUTCFullYear() - from.getUTCFullYear()) * 12 + (to.getUTCMonth() - from.getUTCMonth());
}

/** Same quote for a whole login session, a different one (usually) on the next login. */
export function pickForSession<T>(items: T[], sessionId: string | undefined): T | undefined {
  if (!items.length) return undefined;
  const seed = sessionId ? [...sessionId].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7) : Date.now();
  return items[seed % items.length];
}
