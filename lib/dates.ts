// Users are in Pakistan, but the server runs in UTC and a browser can be in
// any zone. Format and pick "today" in this zone everywhere so pages and
// emails show the same day the user sees on their own calendar.
export const APP_TIME_ZONE = "Asia/Karachi";

/** Formats a date in Pakistan time, e.g. formatDate(d, { day: "numeric", month: "short" }). */
export function formatDate(date: Date | string, options: Intl.DateTimeFormatOptions): string {
  return new Date(date).toLocaleDateString("en-PK", { timeZone: APP_TIME_ZONE, ...options });
}

/**
 * Today's date in Pakistan as "YYYY-MM-DD" — the value date inputs use, and
 * what transaction dates are stored as (UTC midnight of that calendar day).
 */
export function todayISO(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: APP_TIME_ZONE }).format(now);
}

/** Date and time in Pakistan, e.g. "20 Oct, 9:41 pm". */
export function formatDateTime(date: Date | string): string {
  return new Date(date).toLocaleString("en-PK", {
    timeZone: APP_TIME_ZONE,
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** The instant a "YYYY-MM-DD" day starts in Pakistan (UTC+5 all year — no DST). */
export function startOfDayInPakistan(isoDate: string): Date {
  return new Date(`${isoDate}T00:00:00+05:00`);
}
