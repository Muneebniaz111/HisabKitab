import { z } from "zod";
import { money } from "./money";

export const SAVING_STATUSES = ["ACTIVE", "COMPLETED", "CANCELLED"] as const;

export const createSavingSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(60, "Keep it under 60 characters"),
  targetAmount: money,
  targetDate: z.coerce.date().optional().nullable(),
});

export const updateSavingSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(60, "Keep it under 60 characters"),
  targetAmount: money,
  targetDate: z.coerce.date().optional().nullable(),
  status: z.enum(SAVING_STATUSES),
});

// A user always enters a positive amount; direction ("money leaves the
// account into the goal" vs. the reverse) is picked separately and turned
// into a signed SavingTransaction.amount server-side.
export const allocationSchema = z.object({
  direction: z.enum(["ALLOCATE", "WITHDRAW"]),
  accountId: z.string().min(1, "Account is required"),
  amount: money,
  date: z.coerce.date({ error: "Enter a valid date" }),
  description: z.string().trim().max(120).optional(),
});
