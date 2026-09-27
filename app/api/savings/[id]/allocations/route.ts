import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUserId } from "@/lib/session";
import { allocationSchema } from "@/lib/validations/saving";
import { decrementBalanceOrThrow, decrementSavingOrThrow, InsufficientFundsError, type PrismaTx } from "@/lib/balance-guard";
import { notifySavingAllocation } from "@/lib/email/notify";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: savingId } = await params;
  const userId = await getCurrentUserId();

  const saving = await db.saving.findUnique({ where: { id: savingId } });
  if (!saving || saving.userId !== userId) {
    return NextResponse.json({ error: "Saving goal not found" }, { status: 404 });
  }
  if (saving.status === "CANCELLED") {
    return NextResponse.json({ error: "This goal is cancelled — reactivate it first to move funds." }, { status: 400 });
  }

  const parsed = allocationSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { direction, accountId, amount, date, description } = parsed.data;

  const account = await db.account.findUnique({ where: { id: accountId } });
  if (!account || account.userId !== userId || account.isArchived) {
    return NextResponse.json({ error: "Invalid account" }, { status: 400 });
  }

  // Positive amount = money moves account → goal. Negative = goal → account.
  // A single signed field keeps both directions the same shape; see
  // lib/types.ts:SavingTransactionRecord.
  const signedAmount = direction === "ALLOCATE" ? amount : -amount;

  try {
    const updatedSaving = await db.$transaction(async (tx: PrismaTx) => {
      if (direction === "ALLOCATE") {
        // Money leaving the account into the goal — same overdraft guard
        // as an expense or transfer. See lib/balance-guard.ts.
        await decrementBalanceOrThrow(tx, accountId, account.name, amount);
      } else {
        // Money leaving the goal back into the account — the atomic
        // version of what used to be a separate pre-check (racy: two
        // concurrent withdrawals could both pass a plain `if` check
        // before either committed).
        await decrementSavingOrThrow(tx, savingId, saving.name, amount);
        await tx.account.update({ where: { id: accountId }, data: { currentBalance: { increment: amount } } });
      }

      if (direction === "ALLOCATE") {
        await tx.saving.update({ where: { id: savingId }, data: { currentAmount: { increment: amount } } });
      }

      await tx.savingTransaction.create({
        data: { savingId, accountId, amount: signedAmount, date, description },
      });

      return tx.saving.findUniqueOrThrow({ where: { id: savingId } });
    });

    notifySavingAllocation(userId, {
      direction,
      goalName: saving.name,
      account: account.name,
      amount,
      newTotal: Number(updatedSaving.currentAmount),
      date: date.toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" }),
    });

    return NextResponse.json(updatedSaving, { status: 201 });
  } catch (err) {
    if (err instanceof InsufficientFundsError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    throw err;
  }
}
