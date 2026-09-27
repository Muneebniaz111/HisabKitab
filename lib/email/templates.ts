const COLORS = {
  paper: "#ece5d3",
  surface: "#f6f2e7",
  ink: "#26261e",
  inkMuted: "#6b6656",
  rule: "#c9bd9c",
  credit: "#2f5d42",
  debit: "#8c2f2f",
  accent: "#1f3b57",
};

function money(amount: number): string {
  return `Rs. ${Math.round(Math.abs(amount)).toLocaleString("en-PK")}`;
}

function layout(title: string, bodyHtml: string, footerNote?: string): string {
  return `<!DOCTYPE html>
<html>
  <body style="margin:0; padding:0; background:${COLORS.paper}; font-family:Georgia,'Times New Roman',serif;">
    <div style="max-width:480px; margin:0 auto; padding:32px 16px;">
      <p style="margin:0 0 20px; font-style:italic; font-size:19px; color:${COLORS.ink};">Hisab-Kitab</p>
      <div style="background:${COLORS.surface}; border:1px solid ${COLORS.rule}; border-radius:4px; padding:28px;">
        <h1 style="margin:0 0 16px; font-size:17px; font-weight:600; color:${COLORS.ink};">${title}</h1>
        ${bodyHtml}
      </div>
      <p style="margin:20px 0 0; font-size:12px; color:${COLORS.inkMuted}; font-family:Arial,sans-serif;">
        ${footerNote ?? "Automated notification from your Hisab-Kitab ledger."}
      </p>
    </div>
  </body>
</html>`;
}

function row(label: string, value: string, valueColor = COLORS.ink): string {
  return `<tr>
    <td style="padding:5px 0; font-size:13px; color:${COLORS.inkMuted}; font-family:Arial,sans-serif;">${label}</td>
    <td style="padding:5px 0; font-size:13px; color:${valueColor}; font-family:Arial,sans-serif; text-align:right; font-weight:600;">${value}</td>
  </tr>`;
}

function table(rows: string): string {
  return `<table style="width:100%; border-collapse:collapse; margin-top:4px;">${rows}</table>`;
}

// ── Transaction notifications ──────────────────────────────────────────

export function incomeAddedEmail(p: { description: string; category: string; account: string; amount: number; date: string }) {
  return {
    subject: `Income added — ${money(p.amount)}`,
    html: layout(
      "Income Added",
      `<p style="margin:0 0 12px; font-size:14px; color:${COLORS.ink}; font-family:Arial,sans-serif;">${p.description || p.category}</p>
       ${table([
         row("Amount", `+${money(p.amount)}`, COLORS.credit),
         row("Category", p.category),
         row("Account", p.account),
         row("Date", p.date),
       ].join(""))}`
    ),
  };
}

export function expenseAddedEmail(p: { description: string; category: string; account: string; amount: number; date: string }) {
  return {
    subject: `Expense added — ${money(p.amount)}`,
    html: layout(
      "Expense Added",
      `<p style="margin:0 0 12px; font-size:14px; color:${COLORS.ink}; font-family:Arial,sans-serif;">${p.description || p.category}</p>
       ${table([
         row("Amount", `-${money(p.amount)}`, COLORS.debit),
         row("Category", p.category),
         row("Account", p.account),
         row("Date", p.date),
       ].join(""))}`
    ),
  };
}

export function transferMadeEmail(p: { fromAccount: string; toAccount: string; amount: number; date: string }) {
  return {
    subject: `Transfer made — ${money(p.amount)}`,
    html: layout(
      "Transfer Made",
      `<p style="margin:0 0 12px; font-size:14px; color:${COLORS.ink}; font-family:Arial,sans-serif;">${p.fromAccount} → ${p.toAccount}</p>
       ${table([row("Amount", money(p.amount), COLORS.accent), row("Date", p.date)].join(""))}`
    ),
  };
}

export function savingAllocationEmail(p: {
  direction: "ALLOCATE" | "WITHDRAW";
  goalName: string;
  account: string;
  amount: number;
  newTotal: number;
  date: string;
}) {
  const verb = p.direction === "ALLOCATE" ? "Added to" : "Withdrawn from";
  return {
    subject: `${verb} "${p.goalName}" — ${money(p.amount)}`,
    html: layout(
      `Savings ${p.direction === "ALLOCATE" ? "Deposit" : "Withdrawal"}`,
      `<p style="margin:0 0 12px; font-size:14px; color:${COLORS.ink}; font-family:Arial,sans-serif;">${verb} <strong>${p.goalName}</strong></p>
       ${table([
         row("Amount", money(p.amount), p.direction === "ALLOCATE" ? COLORS.credit : COLORS.debit),
         row("Account", p.account),
         row("New goal total", money(p.newTotal)),
         row("Date", p.date),
       ].join(""))}`
    ),
  };
}

// ── Reminders ───────────────────────────────────────────────────────────

export function savingsReminderEmail(
  goals: { name: string; currentAmount: number; targetAmount: number }[]
) {
  const items = goals
    .map((g) => {
      const pct = g.targetAmount > 0 ? Math.min(100, Math.round((g.currentAmount / g.targetAmount) * 100)) : 0;
      return `<tr>
        <td style="padding:6px 0; font-size:13px; color:${COLORS.ink}; font-family:Arial,sans-serif;">${g.name}</td>
        <td style="padding:6px 0; font-size:13px; color:${COLORS.inkMuted}; font-family:Arial,sans-serif; text-align:right;">
          ${money(g.currentAmount)} of ${money(g.targetAmount)} (${pct}%)
        </td>
      </tr>`;
    })
    .join("");

  return {
    subject: "Your weekly savings check-in",
    html: layout(
      "Savings Check-In",
      `<p style="margin:0 0 12px; font-size:14px; color:${COLORS.ink}; font-family:Arial,sans-serif;">
         Here's where your active goals stand this week:
       </p>${table(items)}`,
      "Sent every 7 days while you have at least one active savings goal."
    ),
  };
}

export function recurringDueSoonEmail(p: {
  description: string;
  category: string;
  account: string;
  amount: number;
  type: "INCOME" | "EXPENSE";
  dueDate: string;
}) {
  return {
    subject: `Upcoming: ${p.description || p.category} due ${p.dueDate}`,
    html: layout(
      "Recurring Transaction Due Soon",
      `<p style="margin:0 0 12px; font-size:14px; color:${COLORS.ink}; font-family:Arial,sans-serif;">
         <strong>${p.description || p.category}</strong> is scheduled to post in 2 days.
       </p>
       ${table([
         row("Amount", `${p.type === "INCOME" ? "+" : "-"}${money(p.amount)}`, p.type === "INCOME" ? COLORS.credit : COLORS.debit),
         row("Account", p.account),
         row("Due", p.dueDate),
       ].join(""))}`
    ),
  };
}
