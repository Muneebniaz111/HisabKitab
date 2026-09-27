import { z } from "zod";

const amount = z.coerce.number({ error: "Enter a number" }).finite().positive("Amount must be greater than 0");
const date = z.coerce.date({ error: "Enter a valid date" });
const description = z.string().trim().max(120).optional();
const notes = z.string().trim().max(500).optional();

const incomeOrExpenseSchema = z.object({
  type: z.enum(["INCOME", "EXPENSE"]),
  accountId: z.string().min(1, "Account is required"),
  categoryId: z.string().min(1, "Category is required"),
  amount,
  date,
  description,
  notes,
});

const transferSchema = z
  .object({
    type: z.literal("TRANSFER"),
    fromAccountId: z.string().min(1, "From account is required"),
    toAccountId: z.string().min(1, "To account is required"),
    amount,
    date,
    description,
    notes,
  })
  .refine((data) => data.fromAccountId !== data.toAccountId, {
    message: "From and To accounts must be different",
    path: ["toAccountId"],
  });

export const createTransactionSchema = z.discriminatedUnion("type", [
  incomeOrExpenseSchema,
  transferSchema,
]);

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;

// Same shape for edits — the API route resolves old vs. new balance deltas.
export const updateTransactionSchema = createTransactionSchema;
export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>;
