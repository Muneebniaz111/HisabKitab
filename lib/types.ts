import type { Account, Category, RecurringTransaction, Transaction } from "@prisma/client";

// Row shapes built from the Prisma-generated models, so they follow
// prisma/schema.prisma. Decimal money fields become `number` because these
// shapes are passed from server to client components, which can't receive
// a Prisma Decimal; convert with .toNumber() when building them.

export type { AccountType, CategoryKind, RecurrenceFrequency, TransactionType } from "@prisma/client";

export type AccountRecord = Omit<Account, "openingBalance" | "currentBalance"> & {
  openingBalance: number;
  currentBalance: number;
};

export type TransactionRecord = Omit<Transaction, "amount"> & { amount: number };

export type CategoryRecord = Category;

export type TransactionWithRelations = TransactionRecord & {
  account: { id: string; name: string } | null;
  fromAccount: { id: string; name: string } | null;
  toAccount: { id: string; name: string } | null;
  category: { id: string; name: string } | null;
};

export type StatementRow = {
  id: string;
  date: string; // ISO
  type: "INCOME" | "EXPENSE" | "TRANSFER_IN" | "TRANSFER_OUT";
  description: string;
  counterpart: string; // category name, or the other account in a transfer
  delta: number; // signed effect on this account
  runningBalance: number;
};

// Recurring rules only ever hold INCOME or EXPENSE (see createRecurringSchema).
export type RecurringTransactionRecord = Omit<RecurringTransaction, "amount" | "type"> & {
  type: "INCOME" | "EXPENSE";
  amount: number;
};

export type RecurringWithRelations = RecurringTransactionRecord & {
  account: { id: string; name: string };
  category: { id: string; name: string } | null;
};
