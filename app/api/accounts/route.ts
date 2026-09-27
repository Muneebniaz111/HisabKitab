import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUserId } from "@/lib/session";
import { createAccountSchema } from "@/lib/validations/account";

export async function GET(request: Request) {
  const userId = await getCurrentUserId();
  const includeArchived = new URL(request.url).searchParams.get("includeArchived") === "true";

  const accounts = await db.account.findMany({
    where: { userId, ...(includeArchived ? {} : { isArchived: false }) },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(accounts);
}

export async function POST(request: Request) {
  const userId = await getCurrentUserId();
  const parsed = createAccountSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { name, type, openingBalance } = parsed.data;

  // currentBalance starts equal to openingBalance; it only ever moves via
  // transaction/transfer creation from here on (see Phase 3).
  const account = await db.account.create({
    data: { userId, name, type, openingBalance, currentBalance: openingBalance },
  });

  return NextResponse.json(account, { status: 201 });
}
