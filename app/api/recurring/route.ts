import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUserId } from "@/lib/session";
import { createRecurringSchema } from "@/lib/validations/recurring";

export async function GET() {
  const userId = await getCurrentUserId();

  const rules = await db.recurringTransaction.findMany({
    where: { userId },
    include: {
      account: { select: { id: true, name: true } },
      category: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(rules);
}

export async function POST(request: Request) {
  const userId = await getCurrentUserId();
  const parsed = createRecurringSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { type, accountId, categoryId, amount, description, frequency, dayOfMonth, startDate } = parsed.data;

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

  const rule = await db.recurringTransaction.create({
    data: {
      userId,
      type,
      accountId,
      categoryId,
      amount,
      description,
      frequency,
      dayOfMonth: frequency === "MONTHLY" ? (dayOfMonth ?? startDate.getUTCDate()) : null,
      nextRunDate: startDate,
      isActive: true,
    },
  });

  return NextResponse.json(rule, { status: 201 });
}
