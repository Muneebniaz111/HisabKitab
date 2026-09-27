// These mirror models in prisma/schema.prisma. Declared locally rather than
// imported from "@prisma/client" because that import only resolves after
// `prisma generate` has run against a real network — see README. Decimal
// fields are typed `number`; every consumer converts with Number(...)
// immediately (Prisma's Decimal converts cleanly via its toString()).

export type AccountType = "BANK" | "MOBILE_WALLET" | "CASH" | "OTHER";

export type AccountRecord = {
  id: string;
  userId: string;
  name: string;
  type: AccountType;
  openingBalance: number;
  currentBalance: number;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type TransactionType = "INCOME" | "EXPENSE" | "TRANSFER";
export type CategoryKind = "INCOME" | "EXPENSE";

export type TransactionRecord = {
  id: string;
  userId: string;
  type: TransactionType;
  amount: number;
  description: string | null;
  date: Date;
  notes: string | null;
  accountId: string | null;
  categoryId: string | null;
  fromAccountId: string | null;
  toAccountId: string | null;
  recurringId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type CategoryRecord = {
  id: string;
  userId: string;
  name: string;
  kind: CategoryKind;
  icon: string | null;
  createdAt: Date;
};

export type TransactionWithRelations = TransactionRecord & {
  account: { id: string; name: string } | null;
  fromAccount: { id: string; name: string } | null;
  toAccount: { id: string; name: string } | null;
  category: { id: string; name: string } | null;
};

export type SavingStatus = "ACTIVE" | "COMPLETED" | "CANCELLED";

export type SavingRecord = {
  id: string;
  userId: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: Date | null;
  status: SavingStatus;
  createdAt: Date;
  updatedAt: Date;
};

export type SavingTransactionRecord = {
  id: string;
  savingId: string;
  accountId: string;
  amount: number;
  date: Date;
  description: string | null;
  createdAt: Date;
};

export type SavingWithAllocations = SavingRecord & {
  savingTransactions: (SavingTransactionRecord & { account: { id: string; name: string } })[];
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

export type RecurrenceFrequency = "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";

export type RecurringTransactionRecord = {
  id: string;
  userId: string;
  type: "INCOME" | "EXPENSE";
  amount: number;
  description: string | null;
  accountId: string;
  categoryId: string | null;
  frequency: RecurrenceFrequency;
  dayOfMonth: number | null;
  nextRunDate: Date;
  isActive: boolean;
  reminderSentAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type RecurringWithRelations = RecurringTransactionRecord & {
  account: { id: string; name: string };
  category: { id: string; name: string } | null;
};
