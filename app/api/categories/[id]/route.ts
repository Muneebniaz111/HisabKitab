import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUserId } from "@/lib/session";

async function loadOwnedCategory(id: string, userId: string) {
  const category = await db.category.findUnique({ where: { id } });
  if (!category || category.userId !== userId) return null;
  return category;
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await getCurrentUserId();

  if (!(await loadOwnedCategory(id, userId))) {
    return NextResponse.json({ error: "Category not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const category = await db.category.update({ where: { id }, data: { name } });
  return NextResponse.json(category);
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await getCurrentUserId();

  if (!(await loadOwnedCategory(id, userId))) {
    return NextResponse.json({ error: "Category not found" }, { status: 404 });
  }

  const [txCount, ruleCount] = await Promise.all([
    db.transaction.count({ where: { categoryId: id } }),
    db.recurringTransaction.count({ where: { categoryId: id } }),
  ]);

  if (txCount > 0 || ruleCount > 0) {
    return NextResponse.json(
      { error: "This category is used by existing transactions or recurring rules and can't be deleted." },
      { status: 400 }
    );
  }

  await db.category.delete({ where: { id } });
  return NextResponse.json({ deleted: true });
}
