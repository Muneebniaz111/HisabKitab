import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUserId } from "@/lib/session";
import { createSavingSchema } from "@/lib/validations/saving";

export async function GET() {
  const userId = await getCurrentUserId();

  const savings = await db.saving.findMany({
    where: { userId },
    include: {
      savingTransactions: {
        include: { account: { select: { id: true, name: true } } },
        orderBy: { date: "desc" },
        take: 3,
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(savings);
}

export async function POST(request: Request) {
  const userId = await getCurrentUserId();
  const parsed = createSavingSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { name, targetAmount, targetDate } = parsed.data;

  const saving = await db.saving.create({
    data: { userId, name, targetAmount, targetDate: targetDate ?? null, currentAmount: 0 },
  });

  return NextResponse.json(saving, { status: 201 });
}
