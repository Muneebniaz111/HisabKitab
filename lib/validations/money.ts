import { z } from "zod";

// Largest value a Decimal(14, 2) column can hold (see prisma/schema.prisma).
export const MAX_AMOUNT = 999_999_999_999.99;

// Comparing against the 2-decimal rounding (rather than checking n * 100 is
// an integer) stays exact near MAX_AMOUNT, where n * 100 picks up float error.
const amount = z.coerce
  .number({ error: "Enter a number" })
  .finite()
  .max(MAX_AMOUNT, "Amount is too large")
  .refine((n) => Number(n.toFixed(2)) === n, "Use at most 2 decimal places");

export const money = amount.refine((n) => n > 0, "Amount must be greater than 0");

export const nonNegativeMoney = amount.refine((n) => n >= 0, "Amount can't be negative");
