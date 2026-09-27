# Hisab-Kitab

A personal double-entry-inspired income / expense / transfer / savings ledger.
Next.js (App Router) + TypeScript + Tailwind, Prisma → Supabase Postgres, deployed on Vercel.

## Build status

### Data integrity, email, and reporting pass (post-launch)

**⚠️ Requires a migration.** Two new nullable fields were added to
`prisma/schema.prisma` (`User.lastSavingsReminderAt`,
`RecurringTransaction.reminderSentAt`) — run
`npx prisma migrate dev --name add_notification_tracking` before this
will work.

**Two real bugs fixed:**
- **Account Statement was broken.** `StatementView` passed Prisma
  `Decimal` objects straight into `buildAccountStatement()`, which does
  real arithmetic (`running += delta`) on them. JS's `+`/`-` operators on
  a non-primitive object fall back to string coercion — so instead of
  adding numbers, it was silently doing string concatenation, producing
  garbled running balances. Fixed by converting to `Number(...)` before
  the math, matching every other report view in that file.
- **Category dropdowns in "Add Transaction" and "Add Recurring" could
  render with no valid selection.** Both forms default to "Expense" as
  the pre-selected type, but `categoryId` initialized to `""` regardless
  — so unless the user actively clicked the type toggle, the Select had
  no item matching its value. Fixed with a lazy initializer that computes
  a real default category on mount. Also bumped the Select popover's
  z-index above the Dialog's as a defensive measure.

**Insufficient-funds validation — genuinely race-condition-proof, not
just a check-then-write:**
- `lib/balance-guard.ts` — the check and the balance update are the
  *same* Postgres statement (`UPDATE ... WHERE current_balance >= amount`
  via `updateMany`), not a separate read-then-write. Two concurrent
  requests can't both pass a check before either commits, because there's
  no window where that's possible — Postgres evaluates the WHERE clause
  and applies the write atomically.
- Applies to expenses, transfers (the *from* account), and savings
  allocations. Editing a transaction to a larger amount is covered too —
  `app/api/transactions/[id]/route.ts` nets the reversed-old and
  applied-new deltas per account before checking, so "increase an
  existing expense beyond what's left" is caught, not just "new expense
  exceeds balance."
- Every money-moving route now uses Prisma's *interactive* transaction
  form (`db.$transaction(async (tx) => ...)`) instead of the array form,
  since the guard needs to run inside the same transaction as the write
  it's guarding.
- **Recurring transactions are a deliberate exception** — auto-generated
  expenses still post even if they'd overdraw the account, rather than
  silently failing to record a bill that's happening in the real world
  regardless of what the tracker thinks. This is a judgment call worth
  knowing about, not something to assume.

**Email notifications** (`lib/email/`) — via Resend, `RESEND_API_KEY` in
`.env`. Unset, the app runs fine and just logs a warning instead of
sending — **not tested against a live inbox in this sandbox** (no
network route to Resend's API here), same caveat as everything else that
needs external network access in this build environment.
- Immediate: income added, expense added, transfer made, savings
  deposit/withdrawal — each scheduled with Next's `after()` so sending
  never adds latency to (or risk to) the transaction that triggered it.
- Weekly savings digest (one consolidated email per user listing all
  active goals, not one email per goal) and "recurring due in 2 days"
  reminders — both guarded (`lastSavingsReminderAt` /
  `reminderSentAt`) so the daily cron or the dashboard's lazy fallback
  can run repeatedly without ever double-sending.

**Savings and recurring transactions now show in the ledger.** Recurring
already worked — `lib/recurring.ts` materializes real `Transaction` rows.
Savings allocations didn't: they live in a separate `SavingTransaction`
table and never appeared in `/transactions` or the Monthly Ledger at all.
`lib/ledger-query.ts` merges both into one sorted list — a read-side
merge only, doesn't touch how savings are stored or balanced. Savings
rows are read-only in this view (edit/delete stays on the Savings page,
where the atomic allocate/withdraw logic lives).

**Category Breakdown now has an account filter** — "All accounts" or a
specific one, via the same `AccountPicker` the Statement view uses
(extended with an `allowAll` option).

**ACID / scalability, honestly assessed**: every multi-step financial
write already went through `db.$transaction` before this pass; this pass
adds the race-condition-proof guards on top. "Secure, scalable, and
zero-downtime" beyond that is mostly Supabase (managed Postgres, backups,
HA) and Vercel (stateless, zero-downtime deploys by default) doing what
they're built for, not something more app code changes — nothing further needed here.

## What's here after Phase 6

| Phase | Scope | Status |
|---|---|---|
| 1 | Project scaffold, Prisma schema, folder structure, design system, dashboard shell | ✅ done |
| 2 | Accounts module (CRUD, opening/current balance) | ✅ done |
| 3 | Transactions module (Income / Expense / Transfer, atomic balance updates) | ✅ done |
| 4 | Savings goals | ✅ done |
| 5 | Reports & Analytics (monthly ledger, category breakdown, exports) | ✅ done |
| 6 | Auth (Supabase Auth), recurring transactions, polish | ✅ done |

## What's here after Phase 6

### UI refresh (post-launch)

- **Sidebar**: narrower desktop rail (`w-52`, was `w-60`), plus a real
  mobile drawer (`components/app-shell/sidebar.tsx`) — the old sidebar had
  no mobile behavior at all, it just overflowed.
- **Header/sidebar alignment**: `PageHeader` and the sidebar's brand row
  both use a fixed `h-16` — their bottom borders line up flush across the
  top of the app on every page, at every viewport width.
- **Fewer decorative lines**: removed the repeating-line "ruled paper"
  texture (`.ruled-surface`) from every list — rows now separate with
  `divide-y divide-rule/60` (a line between actual rows, not bleeding into
  empty space). Dashboard/report stat tiles were glued together with
  hairline `gap-px` seams; they're separate bordered cards with real
  `gap-4` between them now.
- **Responsive throughout**: every grid that was rigidly 2/3/5-column now
  stacks below `sm`/`lg` (dashboard, savings, category breakdown, category
  manager, reports); filter tab bars scroll horizontally instead of
  overflowing; dialogs no longer touch screen edges on narrow viewports and
  scroll internally if a form is taller than the screen.
- **A real bug this pass caught**: the category-manager row actions used
  `opacity-0 group-hover:opacity-100` unconditionally — on a touch device
  with no hover state, those edit/delete buttons would have been
  permanently invisible and unusable. Now hover-to-reveal only applies at
  `sm:` and up; touch/mobile always shows them.

- **Real auth, replacing the demo-user placeholder**: `@supabase/ssr` client
  in `lib/supabase/` (browser + server variants), `middleware.ts` refreshes
  the session on every request and redirects unauthenticated visits to
  `/login`. `/login` and `/signup` (email + password), `/auth/callback`
  handles the email-confirmation redirect.
- **One id, no mapping table** — Supabase's `auth.users.id` (a UUID) is
  reused directly as our Prisma `User.id` in `lib/session.ts`'s
  `getCurrentUserId()`, the same function every route/page has called since
  Phase 2. That's the whole migration: one file changed, nothing else in
  the app knew or cared that the user source changed.
- **Recurring transactions** — `RecurringTransaction` rules (Salary, rent,
  subscriptions) with Daily/Weekly/Monthly/Yearly frequency, managed from
  Settings. `lib/recurring.ts:processDueRecurringTransactions()` turns due
  occurrences into real `Transaction` rows using the same
  `transactionEffects()` balance math as everywhere else, catching up on
  every missed occurrence atomically (one `db.$transaction` per rule) if
  the app hasn't been opened in a while. Wired two ways: lazily on every
  dashboard load, and via `/api/cron/process-recurring` + `vercel.json` for
  a real daily Vercel Cron run in production.
- **Settings is now real**: category rename/add/delete (blocked while a
  category is still in use, same pattern as accounts/goals), the full
  recurring-transactions list, a link out to `/accounts`, and the signed-in
  user's email with sign-out.

### Known gap to flag

API routes rely on `middleware.ts` to gate auth — if a session expires
mid-page (not on initial load), a `fetch()` from a client component will
follow the middleware's redirect to `/login` and receive an HTML page
instead of a JSON error. Fine for a personal single-user app; if this ever
needs to be more robust, the fix is having API routes check auth
themselves and return a proper `401` instead of relying solely on the
middleware redirect.

## What's here after Phase 1

- `prisma/schema.prisma` — full data model: `User`, `Account`, `Category`,
  `Transaction` (income/expense/transfer in one table), `RecurringTransaction`,
  `Saving`, `SavingTransaction`.
- `lib/calculations.ts` — pure, dependency-free domain logic (balance deltas,
  transfer handling, ledger summaries, savings progress). Unit-testable
  without a database.
- `lib/db.ts` — Prisma client singleton.
- `app/(app)/` — the authenticated shell: sidebar nav + one page per section
  (Dashboard, Transactions, Accounts, Savings, Reports, Settings). Dashboard
  has a full static preview wired to the design system; the rest are marked
  placeholders naming the phase that fills them in.
- Design system: "paper and ink" ledger tokens in `app/globals.css`
  (`--paper`, `--ink`, `--credit`, `--debit`, `--accent`), Fraunces for
  display type, IBM Plex Sans for body, IBM Plex Mono for every rupee figure
  (`.ledger-amount`) so amounts align the way they do in a ruled ledger book.

## What's here after Phase 5

- **`/reports`** — four views, all sharing the same tab bar (`ReportNav`)
  with view-appropriate filters preserved in the URL:
  - **Monthly Ledger** — income/expenses/net for a chosen month, the full
    transaction list, and a CSV export.
  - **Category Breakdown** — expense-by-category pie chart (Recharts) plus
    an income-by-category table, both for the chosen month.
  - **Trends** — income vs. expenses bar chart for the last 6 months.
  - **Account Statement** — every transaction that touched one account,
    chronological, with a running balance and CSV export.
- **The statement's running balance isn't independently reimplemented** —
  `lib/reports.ts:buildAccountStatement()` replays each transaction through
  the exact same `transactionEffects()` function Phase 3 uses for live
  balance updates, so the two can never quietly disagree.
- **CSV export is real, not a stub** — `CsvExportButton` builds the CSV
  client-side from whatever's already on screen and triggers a browser
  download. PDF export isn't built yet; CSV opens in Excel/Sheets/Numbers
  in the meantime.
- `categoryBreakdown()` in `lib/calculations.ts` (generalized from the
  Phase 1 stub) powers both the expense chart and the income table.

## What's here after Phase 4

- **`/savings`** — goal cards with a progress bar (`Rs. X of Rs. Y`), target
  date, status badge, and the 3 most recent allocations shown inline.
- **One signed field carries both directions**: `SavingTransaction.amount`
  is positive for "Add Funds" (account → goal) and negative for "Withdraw"
  (goal → account). That single sign is enough to update both the account
  balance and the goal's `currentAmount` with the same arithmetic either
  way — see `app/api/savings/[id]/allocations/route.ts`.
- **Every allocation is atomic** — the account balance update, the goal's
  `currentAmount` update, and the `SavingTransaction` record are one
  `db.$transaction([...])`, same pattern as Phase 3's transfers.
- **A goal can't go net-negative**: withdrawing more than its
  `currentAmount` is rejected server-side. A goal with money still in it
  can't be deleted outright — withdraw first, then delete — so funds are
  never silently lost.
- **Dashboard**'s Savings tile now shows this month's net allocations
  (deposits minus withdrawals), matching the monthly framing of
  Income/Expenses next to it. Every dashboard tile is now live data.

## What's here after Phase 3

- **`/transactions`** — Add Transaction dialog (Income / Expense / Transfer
  toggle with type-appropriate fields), a filterable list (type, account,
  month via URL search params — shareable/bookmarkable filtered views), and
  full edit/delete on every row.
- **Balance math lives in one place**: `lib/calculations.ts:transactionEffects()`
  computes the account delta(s) for any transaction — one delta for
  income/expense, two opposite deltas for a transfer. Create, edit, and
  delete all call the same function, so there's exactly one definition of
  "what a transaction does to a balance," not three.
- **Every write is atomic** — `db.$transaction([...])` wraps the transaction
  row and every balance update it triggers. A transfer's two account
  updates either both happen or neither does; same for reversing an edited
  or deleted transaction's old effect.
- **Editing reverses-then-reapplies**: changing a transaction's amount,
  account, or type first negates its old effect on the old account(s), then
  applies the new effect on the new account(s) — all in the same DB
  transaction, so balances never pass through an inconsistent intermediate
  state.
- **Categories** — `lib/categories.ts` lazily seeds the default set from
  requirements.docx §4 the first time a user has none; `POST /api/categories`
  supports adding custom ones. Full rename/delete management is Phase 6.
- **Dashboard** is now fully live except Savings: Total Balance, Accounts,
  this month's Income/Expenses, and the 5 most recent transactions all come
  from Prisma.

## What's here after Phase 2

- **`/accounts`** — full CRUD: add an account (name, type, opening balance),
  edit name/type, archive/restore, delete. Deleting an account that already
  has transaction history archives it instead — history is never silently
  lost.
- **`app/api/accounts/route.ts`** and **`app/api/accounts/[id]/route.ts`** —
  REST endpoints backing the UI, each request scoped to the current user and
  validated with Zod (`lib/validations/account.ts`).
- **Dashboard** — the Accounts card and Total Balance tile are now live
  Prisma data instead of mock data; Income/Expenses/Savings and Recent
  Transactions stay as labeled preview until Phase 3/4/5.
- **`lib/session.ts`** — a placeholder `getCurrentUserId()` (upserts a demo
  user) standing in until Supabase Auth lands in Phase 6. Every route/page
  calls this one function, so wiring real auth later is a one-file change.
- Opening balance is intentionally not editable after an account is
  created — once transactions exist against it, changing the opening
  balance would silently throw off `currentBalance`. Correcting a balance
  is a job for a transaction (Phase 3), not a schema edit.

## Setup

```bash
npm install

# Supabase → Project Settings → Database, copy both connection strings,
# and Project Settings → API for the auth keys.
cp .env.example .env

npx prisma generate
npx prisma migrate dev --name init

npm run dev
```

**Supabase Auth**: in your Supabase project, Authentication → URL
Configuration, set the Site URL to your app's URL (`http://localhost:3000`
in dev) and add `<site-url>/auth/callback` as a redirect URL — without
this the email-confirmation link in `/signup` will fail. Email/password
sign-up is on by default; email confirmation is on by default too, which
is why `/signup` shows a "check your email" state.

**Recurring transactions in production**: set `CRON_SECRET` in your Vercel
project's env vars and `vercel.json` picks it up automatically — Vercel
Cron sends it as the `Authorization: Bearer` header on the schedule
defined there. Locally, recurring transactions still work via the lazy
catch-up on dashboard load; the cron just makes it run on a schedule
instead of "whenever someone opens the app."

> Built in a sandboxed environment without access to `fonts.googleapis.com`
> or Prisma's binary registry — `npm run build` fetches both on first run
> in a normal network (local machine, CI, or Vercel), no code changes
> needed. Note: this project pins `prisma`/`@prisma/client` to `6.19.3`
> — Prisma 7 removed `url`/`directUrl` from `schema.prisma` in favor of a
> `prisma.config.ts` + driver-adapter setup; 6.x is the last version using
> the schema-based config this project (and this README) assumes.

## Domain rules encoded in the schema (from requirements.docx)

- Meezan Bank / JazzCash / EasyPaisa / Cash are real `Account` rows, not a
  text field on a transaction.
- A **Transfer** is not income or expense — it debits one account and
  credits another for the same amount, and must be applied as a single
  Prisma `$transaction` so both legs succeed or neither does.
- **Savings** allocations are tracked in `SavingTransaction`, separate from
  `Transaction`, so a saving deduction doesn't get double-counted as an
  expense in the monthly ledger.
- Recurring rules (`RecurringTransaction`) generate real `Transaction` rows
  rather than being synthesized on the fly, so history stays accurate even
  if a rule is later edited or deactivated.
