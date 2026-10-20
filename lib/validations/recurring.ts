import { z } from "zod";
import { money } from "./money";

export const RECURRENCE_FREQUENCIES = ["DAILY", "WEEKLY", "MONTHLY", "YEARLY"] as const;

export const FREQUENCY_LABELS: Record<(typeof RECURRENCE_FREQUENCIES)[number], string> = {
  DAILY: "Every day",
  WEEKLY: "Every week",
  MONTHLY: "Every month",
  YEARLY: "Every year",
};

export const createRecurringSchema = z.object({
  type: z.enum(["INCOME", "EXPENSE"]),
  accountId: z.string().min(1, "Account is required"),
  categoryId: z.string().min(1, "Category is required"),
  amount: money,
  description: z.string().trim().max(120).optional(),
  frequency: z.enum(RECURRENCE_FREQUENCIES),
  dayOfMonth: z.coerce.number().int().min(1).max(31).optional(),
  // First occurrence — becomes the rule's initial nextRunDate.
  startDate: z.coerce.date({ error: "Enter a valid date" }),
});

export const updateRecurringSchema = z.object({
  type: z.enum(["INCOME", "EXPENSE"]),
  accountId: z.string().min(1, "Account is required"),
  categoryId: z.string().min(1, "Category is required"),
  amount: money,
  description: z.string().trim().max(120).optional(),
  frequency: z.enum(RECURRENCE_FREQUENCIES),
  dayOfMonth: z.coerce.number().int().min(1).max(31).optional(),
  isActive: z.boolean(),
});
