import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUserId } from "@/lib/session";
import { updateRecurringSchema } from "@/lib/validations/recurring";

async function loadOwnedRule(id: string, userId: string) {
  const rule = await db.recurringTransaction.findUnique({ where: { id } });
  if (!rule || rule.userId !== userId) return null;
  return rule;
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await getCurrentUserId();

  if (!(await loadOwnedRule(id, userId))) {
    return NextResponse.json({ error: "Recurring rule not found" }, { status: 404 });
  }

  const parsed = updateRecurringSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { type, accountId, categoryId, amount, description, frequency, dayOfMonth, isActive } = parsed.data;

  const [account, category] = await Promise.all([
    db.account.findUnique({ where: { id: accountId } }),
    db.category.findUnique({ where: { id: categoryId } }),
  ]);
  if (!account || account.userId !== userId || account.isArchived) {
    return NextResponse.json({ error: "Invalid account" }, { status: 400 });
  }
  if (!category || category.userId !== userId || category.kind !== type) {
    return NextResponse.json({ error: "Invalid category for this type" }, { status: 400 });
  }

  const rule = await db.recurringTransaction.update({
    where: { id },
    data: {
      type,
      accountId,
      categoryId,
      amount,
      description,
      frequency,
      dayOfMonth: frequency === "MONTHLY" ? dayOfMonth : null,
      isActive,
    },
  });

  return NextResponse.json(rule);
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await getCurrentUserId();

  if (!(await loadOwnedRule(id, userId))) {
    return NextResponse.json({ error: "Recurring rule not found" }, { status: 404 });
  }

  // Prisma's default for this optional relation is SetNull on delete: the
  // Transaction rows this rule already generated stay in the ledger with
  // their balance effects intact, just with recurringId cleared — deleting
  // the rule stops future generation, it doesn't erase history.
  await db.recurringTransaction.delete({ where: { id } });
  return NextResponse.json({ deleted: true });
}
