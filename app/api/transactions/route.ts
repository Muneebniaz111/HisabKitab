import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUserId } from "@/lib/session";
import { createTransactionSchema } from "@/lib/validations/transaction";
import { buildTransactionWhere } from "@/lib/transaction-query";
import { decrementBalanceOrThrow, InsufficientFundsError, type PrismaTx } from "@/lib/balance-guard";
import { notifyIncomeAdded, notifyExpenseAdded, notifyTransferMade } from "@/lib/email/notify";

export async function GET(request: Request) {
  const userId = await getCurrentUserId();
  const params = new URL(request.url).searchParams;

  const where = buildTransactionWhere(userId, {
    type: params.get("type"),
    accountId: params.get("accountId"),
    categoryId: params.get("categoryId"),
    month: params.get("month"),
  });

  const transactions = await db.transaction.findMany({
    where,
    include: {
      account: { select: { id: true, name: true } },
      fromAccount: { select: { id: true, name: true } },
      toAccount: { select: { id: true, name: true } },
      category: { select: { id: true, name: true } },
    },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    take: 200,
  });

  return NextResponse.json(transactions);
}

export async function POST(request: Request) {
  const userId = await getCurrentUserId();
  const parsed = createTransactionSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const input = parsed.data;

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

    try {
      // Interactive transaction, not the array form: decrementBalanceOrThrow
      // needs to run its guarded UPDATE inside the same transaction as the
      // transaction row and the credit leg, so an insufficient-funds
      // rejection rolls back all three together — see lib/balance-guard.ts.
      const transaction = await db.$transaction(async (tx: PrismaTx) => {
        await decrementBalanceOrThrow(tx, input.fromAccountId, fromAccount.name, input.amount);
        await tx.account.update({
          where: { id: input.toAccountId },
          data: { currentBalance: { increment: input.amount } },
        });
        return tx.transaction.create({
          data: {
            userId,
            type: "TRANSFER",
            amount: input.amount,
            date: input.date,
            description: input.description,
            notes: input.notes,
            fromAccountId: input.fromAccountId,
            toAccountId: input.toAccountId,
          },
        });
      });

      notifyTransferMade(userId, {
        fromAccount: fromAccount.name,
        toAccount: toAccount.name,
        amount: input.amount,
        date: input.date.toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" }),
      });

      return NextResponse.json(transaction, { status: 201 });
    } catch (err) {
      if (err instanceof InsufficientFundsError) {
        return NextResponse.json({ error: err.message }, { status: 400 });
      }
      throw err;
    }
  }

  // INCOME or EXPENSE
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

  try {
    const transaction = await db.$transaction(async (tx: PrismaTx) => {
      if (input.type === "EXPENSE") {
        // Guarded, atomic decrement — see lib/balance-guard.ts. INCOME
        // never risks going negative, so it takes the plain increment path.
        await decrementBalanceOrThrow(tx, input.accountId, account.name, input.amount);
      } else {
        await tx.account.update({
          where: { id: input.accountId },
          data: { currentBalance: { increment: input.amount } },
        });
      }

      return tx.transaction.create({
        data: {
          userId,
          type: input.type,
          amount: input.amount,
          date: input.date,
          description: input.description,
          notes: input.notes,
          accountId: input.accountId,
          categoryId: input.categoryId,
        },
      });
    });

    const notifyDetails = {
      description: input.description ?? "",
      category: category.name,
      account: account.name,
      amount: input.amount,
      date: input.date.toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" }),
    };
    if (input.type === "INCOME") notifyIncomeAdded(userId, notifyDetails);
    else notifyExpenseAdded(userId, notifyDetails);

    return NextResponse.json(transaction, { status: 201 });
  } catch (err) {
    if (err instanceof InsufficientFundsError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    throw err;
  }
}
