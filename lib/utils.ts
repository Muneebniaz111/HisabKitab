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
