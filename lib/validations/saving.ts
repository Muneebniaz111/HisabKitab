import { z } from "zod";

export const SAVING_STATUSES = ["ACTIVE", "COMPLETED", "CANCELLED"] as const;

export const createSavingSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(60, "Keep it under 60 characters"),
  targetAmount: z.coerce
    .number({ error: "Enter a number" })
    .finite()
    .positive("Target amount must be greater than 0"),
  targetDate: z.coerce.date().optional().nullable(),
});
export type CreateSavingInput = z.infer<typeof createSavingSchema>;

export const updateSavingSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(60, "Keep it under 60 characters"),
  targetAmount: z.coerce.number({ error: "Enter a number" }).finite().positive("Target amount must be greater than 0"),
  targetDate: z.coerce.date().optional().nullable(),
  status: z.enum(SAVING_STATUSES),
});
export type UpdateSavingInput = z.infer<typeof updateSavingSchema>;

// A user always enters a positive amount; direction ("money leaves the
// account into the goal" vs. the reverse) is picked separately and turned
// into a signed SavingTransaction.amount server-side.
export const allocationSchema = z.object({
  direction: z.enum(["ALLOCATE", "WITHDRAW"]),
  accountId: z.string().min(1, "Account is required"),
  amount: z.coerce.number({ error: "Enter a number" }).finite().positive("Amount must be greater than 0"),
  date: z.coerce.date({ error: "Enter a valid date" }),
  description: z.string().trim().max(120).optional(),
});
export type AllocationInput = z.infer<typeof allocationSchema>;
