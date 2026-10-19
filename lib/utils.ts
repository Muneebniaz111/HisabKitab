import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number | string, currency = "Rs.") {
  const value = typeof amount === "string" ? parseFloat(amount) : amount;
  const formatted = new Intl.NumberFormat("en-PK", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.abs(value));
  const sign = value < 0 ? "-" : "";
  return `${sign}${currency} ${formatted}`;
}

/** First readable message from an API error body — a plain string or zod's flatten() shape. */
export function apiErrorMessage(body: { error?: unknown } | null, fallback: string): string {
  const error = body?.error;
  if (typeof error === "string") return error;
  const flat = error as { formErrors?: string[]; fieldErrors?: Record<string, string[]> } | undefined;
  return flat?.formErrors?.[0] ?? Object.values(flat?.fieldErrors ?? {}).flat()[0] ?? fallback;
}
