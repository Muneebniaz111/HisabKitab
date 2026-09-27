import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUserId } from "@/lib/session";
import { updateAccountSchema } from "@/lib/validations/account";

async function loadOwnedAccount(id: string, userId: string) {
  const account = await db.account.findUnique({ where: { id } });
  if (!account || account.userId !== userId) return null;
  return account;
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await getCurrentUserId();

  if (!(await loadOwnedAccount(id, userId))) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  const parsed = updateAccountSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const account = await db.account.update({ where: { id }, data: parsed.data });
  return NextResponse.json(account);
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  // Used for the archive / unarchive toggle: { "isArchived": true | false }.
  const { id } = await params;
  const userId = await getCurrentUserId();

  if (!(await loadOwnedAccount(id, userId))) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  if (typeof body?.isArchived !== "boolean") {
    return NextResponse.json({ error: "isArchived (boolean) is required" }, { status: 400 });
  }

  const account = await db.account.update({
    where: { id },
    data: { isArchived: body.isArchived },
  });
  return NextResponse.json(account);
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await getCurrentUserId();

  if (!(await loadOwnedAccount(id, userId))) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  const activity = await db.transaction.count({
    where: { OR: [{ accountId: id }, { fromAccountId: id }, { toAccountId: id }] },
  });

  if (activity > 0) {
    // Never hard-delete an account with ledger history — archive instead,
    // so past transactions and reports still resolve correctly.
    const account = await db.account.update({ where: { id }, data: { isArchived: true } });
    return NextResponse.json({ archived: true, account });
  }

  await db.account.delete({ where: { id } });
  return NextResponse.json({ deleted: true });
}
