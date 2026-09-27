/** Resolves a "YYYY-MM" string (or the current month if omitted/invalid) into a UTC date range. */
export function monthRange(monthStr?: string | null) {
  const now = new Date();
  let year = now.getUTCFullYear();
  let month = now.getUTCMonth(); // 0-indexed

  if (monthStr && /^\d{4}-\d{2}$/.test(monthStr)) {
    const [y, m] = monthStr.split("-").map(Number);
    year = y;
    month = m - 1;
  }

  const start = new Date(Date.UTC(year, month, 1));
  const end = new Date(Date.UTC(year, month + 1, 1));
  const label = start.toLocaleDateString("en-PK", { month: "long", year: "numeric" });
  const value = `${year}-${String(month + 1).padStart(2, "0")}`;

  return { start, end, label, value };
}

/** The `count` months ending with (and including) `endMonthStr`, oldest first — for trend charts. */
export function recentMonths(count: number, endMonthStr?: string | null) {
  const end = monthRange(endMonthStr);
  const [endYear, endMonthNum] = end.value.split("-").map(Number);

  const months: ReturnType<typeof monthRange>[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(endYear, endMonthNum - 1 - i, 1));
    const monthStr = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    months.push(monthRange(monthStr));
  }
  return months;
}
