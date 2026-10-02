import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUserId } from "@/lib/session";
import { updateTransactionSchema } from "@/lib/validations/transaction";
import { transactionEffects, negateDeltas } from "@/lib/calculations";
import { decrementBalanceOrThrow, InsufficientFundsError, type PrismaTx } from "@/lib/balance-guard";
import type { TransactionRecord } from "@/lib/types";

async function loadOwnedTransaction(id: string, userId: string): Promise<TransactionRecord | null> {
  const transaction = await db.transaction.findUnique({ where: { id } });
  if (!transaction || transaction.userId !== userId) return null;
  return { ...transaction, amount: transaction.amount.toNumber() };
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await getCurrentUserId();

  const existing = await loadOwnedTransaction(id, userId);
  if (!existing) return NextResponse.json({ error: "Transaction not found" }, { status: 404 });

  const parsed = updateTransactionSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const input = parsed.data;

  // Validate the new accounts/category exactly as POST /api/transactions
  // does, and keep references to them — see the netting comment below for
  // why these are the only account names the balance guard can ever need.
  const newAccountNames = new Map<string, string>();

  if (input.type === "TRANSFER") {
    const [fromAccount, toAccount] = await Promise.all([
      db.account.findUnique({ where: { id: input.fromAccountId } }),
      db.account.findUnique({ where: { id: input.toAccountId } }),
    ]);
    if (!fromAccount || fromAccount.userId !== userId || fromAccount.isArchived) {
      return NextResponse.json({ error: "Invalid 'from' account" }, { status: 400 });
    }
    if (!toAccount || toAccount.userId !== userId || toAccount.isArchived) {
      return NextResponse.json({ error: "Invalid 'to' account" }, { status: 400 });
    }
    newAccountNames.set(fromAccount.id, fromAccount.name);
    newAccountNames.set(toAccount.id, toAccount.name);
  } else {
    const [account, category] = await Promise.all([
      db.account.findUnique({ where: { id: input.accountId } }),
      db.category.findUnique({ where: { id: input.categoryId } }),
    ]);
    if (!account || account.userId !== userId || account.isArchived) {
      return NextResponse.json({ error: "Invalid account" }, { status: 400 });
    }
    if (!category || category.userId !== userId || category.kind !== input.type) {
      return NextResponse.json({ error: "Invalid category for this transaction type" }, { status: 400 });
    }
    newAccountNames.set(account.id, account.name);
  }

  // Reverse the old effect, apply the new one — both computed from the
  // same lib/calculations.ts helper POST uses, so there's one source of
  // truth for what a transaction does to account balances.
  const reverseOld = negateDeltas(
    transactionEffects({
      type: existing.type,
      amount: existing.amount,
      accountId: existing.accountId,
      fromAccountId: existing.fromAccountId,
      toAccountId: existing.toAccountId,
    })
  );

  const applyNew = transactionEffects({
    type: input.type,
    amount: input.amount,
    accountId: input.type === "TRANSFER" ? undefined : input.accountId,
    fromAccountId: input.type === "TRANSFER" ? input.fromAccountId : undefined,
    toAccountId: input.type === "TRANSFER" ? input.toAccountId : undefined,
  });

  // Net the two delta sets per account rather than applying them as
  // separate writes — e.g. editing an expense's amount upward on the same
  // account nets to a single negative delta (the increase), which is
  // exactly the case the balance guard needs to catch. An account touched
  // only by reverseOld (its account changed) can only ever net positive —
  // reversing an old debit always adds money back — so it's never a
  // candidate for the guard, which is why newAccountNames above always
  // has a name ready for whichever account does need it.
  const netByAccount = new Map<string, number>();
  for (const e of [...reverseOld, ...applyNew]) {
    netByAccount.set(e.accountId, (netByAccount.get(e.accountId) ?? 0) + e.delta);
  }

  const updateData =
    input.type === "TRANSFER"
      ? {
          type: "TRANSFER" as const,
          amount: input.amount,
          date: input.date,
          description: input.description,
          notes: input.notes,
          fromAccountId: input.fromAccountId,
          toAccountId: input.toAccountId,
          accountId: null,
          categoryId: null,
        }
      : {
          type: input.type,
          amount: input.amount,
          date: input.date,
          description: input.description,
          notes: input.notes,
          accountId: input.accountId,
          categoryId: input.categoryId,
          fromAccountId: null,
          toAccountId: null,
        };

  try {
    const transaction = await db.$transaction(async (tx: PrismaTx) => {
      for (const [accountId, delta] of netByAccount) {
        if (delta < 0) {
          await decrementBalanceOrThrow(tx, accountId, newAccountNames.get(accountId) ?? "account", -delta);
        } else if (delta > 0) {
          await tx.account.update({ where: { id: accountId }, data: { currentBalance: { increment: delta } } });
        }
      }
      return tx.transaction.update({ where: { id }, data: updateData });
    });

    return NextResponse.json(transaction);
  } catch (err) {
    if (err instanceof InsufficientFundsError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    throw err;
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await getCurrentUserId();

  const existing = await loadOwnedTransaction(id, userId);
  if (!existing) return NextResponse.json({ error: "Transaction not found" }, { status: 404 });

  const reverse = negateDeltas(
    transactionEffects({
      type: existing.type,
      amount: existing.amount,
      accountId: existing.accountId,
      fromAccountId: existing.fromAccountId,
      toAccountId: existing.toAccountId,
    })
  );

  await db.$transaction([
    db.transaction.delete({ where: { id } }),
    ...reverse.map((e) =>
      db.account.update({ where: { id: e.accountId }, data: { currentBalance: { increment: e.delta } } })
    ),
  ]);

  return NextResponse.json({ deleted: true });
}
