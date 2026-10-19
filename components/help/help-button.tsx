"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronDown, MessageCircleQuestionMark, X } from "lucide-react";
import { cn } from "@/lib/utils";

// New-user guide. Each topic links to the page it describes.
const TOPICS: { title: string; href?: string; steps: string[] }[] = [
  {
    title: "Getting started",
    steps: [
      "Add your accounts — bank, mobile wallet or cash — on the Accounts page.",
      "Record money coming in and going out on the Transactions page.",
      "Create a savings goal and move money into it.",
      "Check the Dashboard, SmartSpend and Reports to see how you're doing.",
    ],
  },
  {
    title: "Accounts",
    href: "/accounts",
    steps: [
      "Click Add Account, choose a type (Bank, Mobile Wallet, Cash or Other) and enter its opening balance.",
      "Balances update automatically with every transaction.",
      "Archive an account you no longer use; its history is kept.",
    ],
  },
  {
    title: "Transactions",
    href: "/transactions",
    steps: [
      "Click Add Transaction and pick Income, Expense or Transfer.",
      "Income adds to the account, Expense takes from it, Transfer moves money between your own accounts.",
      "Use the filters at the top to find entries by type, account or date.",
    ],
  },
  {
    title: "Savings goals",
    href: "/savings",
    steps: [
      "Click Add Goal, give it a name, a target amount and (optionally) a target date.",
      "Use Add Funds to move money from an account into the goal, or Withdraw to move it back.",
      "The progress bar shows how close you are.",
    ],
  },
  {
    title: "Recurring transactions",
    href: "/settings",
    steps: [
      "In Settings, click Add Recurring for things like rent, bills or salary.",
      "Choose how often it repeats and the first date.",
      "When it's due you'll be asked to confirm. Yes posts it; No keeps it pending.",
      "Pending ones show as Due in Settings — click Deduct now whenever you're ready.",
    ],
  },
  {
    title: "SmartSpend",
    href: "/smartspend",
    steps: [
      "Shows your income, spending, savings and what's left this month.",
      "Points out your biggest and fastest-rising spending categories.",
      "Suggests a monthly savings target and how much to put towards each goal.",
    ],
  },
  {
    title: "Reports",
    href: "/reports",
    steps: [
      "Monthly Ledger: every entry for a month. Category Breakdown: where your money went.",
      "Trends: income vs. expenses over the last 6 months. Account Statement: one account's history.",
      "Use Export CSV to download your data.",
    ],
  },
  {
    title: "Privacy & security",
    steps: [
      "Amounts are hidden as Rs. **** — tap the eye icon to show one.",
      "In charts, click or tap a bar or slice to pin its tooltip, then use its eye icon.",
      "You're signed out after 2 minutes of inactivity, and when you close the browser.",
      "Forgot your password? Use Forgot password? on the sign-in page to get a reset link by email.",
    ],
  },
];

export function HelpButton() {
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      {open && (
        <section
          role="dialog"
          aria-label="Help"
          className="fixed z-30 inset-x-3 bottom-24 sm:inset-x-auto sm:right-6 sm:w-96 max-h-[min(36rem,calc(100vh-8rem))] flex flex-col rounded-lg border border-rule bg-paper shadow-2xl animate-rise"
        >
          <header className="flex items-start justify-between gap-3 rounded-t-lg bg-accent text-paper px-5 py-4">
            <div>
              <h2 className="font-display text-lg leading-tight">Need a hand?</h2>
              <p className="text-xs opacity-80 mt-0.5">How Hisab-Kitab works, step by step.</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close help"
              className="rounded-sm p-1 opacity-80 transition hover:opacity-100 hover:bg-paper/15"
            >
              <X className="size-4" />
            </button>
          </header>

          <div className="overflow-y-auto divide-y divide-rule/60">
            {TOPICS.map((t, i) => (
              <details key={t.title} open={i === 0} className="group px-5 py-3">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium [&::-webkit-details-marker]:hidden">
                  {t.title}
                  <ChevronDown className="size-4 text-ink-muted transition-transform group-open:rotate-180" />
                </summary>
                <ol className="mt-2 space-y-1.5 list-decimal pl-5 text-sm text-ink-muted marker:text-accent">
                  {t.steps.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
                {t.href && (
                  <Link href={t.href} onClick={() => setOpen(false)} className="inline-block mt-2 text-xs text-accent hover:underline">
                    Go to {t.title} →
                  </Link>
                )}
              </details>
            ))}
          </div>
        </section>
      )}

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close help" : "Open help"}
        aria-expanded={open}
        className={cn(
          "fixed z-30 bottom-5 right-5 sm:bottom-6 sm:right-6 flex size-14 items-center justify-center rounded-full bg-accent text-paper shadow-lg transition hover:bg-[#463b95] hover:scale-105",
          open && "rotate-90"
        )}
      >
        {open ? <X className="size-6" /> : <MessageCircleQuestionMark className="size-6" strokeWidth={1.75} />}
      </button>
    </>
  );
}
