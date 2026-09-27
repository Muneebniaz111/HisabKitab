import { z } from "zod";

// Mirrors the AccountType enum in prisma/schema.prisma.
export const ACCOUNT_TYPES = ["BANK", "MOBILE_WALLET", "CASH", "OTHER"] as const;

export const ACCOUNT_TYPE_LABELS: Record<(typeof ACCOUNT_TYPES)[number], string> = {
  BANK: "Bank",
  MOBILE_WALLET: "Mobile Wallet",
  CASH: "Cash",
  OTHER: "Other",
};

export const createAccountSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(60, "Keep it under 60 characters"),
  type: z.enum(ACCOUNT_TYPES),
  openingBalance: z.coerce
    .number({ error: "Enter a number" })
    .finite()
    .min(0, "Opening balance can't be negative"),
});

export const updateAccountSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(60, "Keep it under 60 characters"),
  type: z.enum(ACCOUNT_TYPES),
});

export type CreateAccountInput = z.infer<typeof createAccountSchema>;
export type UpdateAccountInput = z.infer<typeof updateAccountSchema>;
