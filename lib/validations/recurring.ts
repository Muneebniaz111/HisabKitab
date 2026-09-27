import { z } from "zod";

export const RECURRENCE_FREQUENCIES = ["DAILY", "WEEKLY", "MONTHLY", "YEARLY"] as const;

export const createRecurringSchema = z.object({
  type: z.enum(["INCOME", "EXPENSE"]),
  accountId: z.string().min(1, "Account is required"),
  categoryId: z.string().min(1, "Category is required"),
  amount: z.coerce.number({ error: "Enter a number" }).finite().positive("Amount must be greater than 0"),
  description: z.string().trim().max(120).optional(),
  frequency: z.enum(RECURRENCE_FREQUENCIES),
  dayOfMonth: z.coerce.number().int().min(1).max(31).optional(),
  // First occurrence — becomes the rule's initial nextRunDate.
  startDate: z.coerce.date({ error: "Enter a valid date" }),
});
export type CreateRecurringInput = z.infer<typeof createRecurringSchema>;

export const updateRecurringSchema = z.object({
  type: z.enum(["INCOME", "EXPENSE"]),
  accountId: z.string().min(1, "Account is required"),
  categoryId: z.string().min(1, "Category is required"),
  amount: z.coerce.number({ error: "Enter a number" }).finite().positive("Amount must be greater than 0"),
  description: z.string().trim().max(120).optional(),
  frequency: z.enum(RECURRENCE_FREQUENCIES),
  dayOfMonth: z.coerce.number().int().min(1).max(31).optional(),
  isActive: z.boolean(),
});
export type UpdateRecurringInput = z.infer<typeof updateRecurringSchema>;
