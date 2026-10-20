import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUserId } from "@/lib/session";
import { ensureDefaultCategories } from "@/lib/categories";
import { withAudit } from "@/lib/with-audit";

export async function GET(request: Request) {
  const userId = await getCurrentUserId();
  await ensureDefaultCategories(userId);

  const kind = new URL(request.url).searchParams.get("kind");

  const categories = await db.category.findMany({
    where: { userId, ...(kind ? { kind: kind as "INCOME" | "EXPENSE" } : {}) },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(categories);
}

export const POST = withAudit("category.create", async (request: Request) => {
  const userId = await getCurrentUserId();
  const body = await request.json().catch(() => null);

  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const kind = body?.kind;

  if (!name || (kind !== "INCOME" && kind !== "EXPENSE")) {
    return NextResponse.json({ error: "name and kind (INCOME | EXPENSE) are required" }, { status: 400 });
  }

  const category = await db.category.create({ data: { userId, name, kind } });
  return NextResponse.json(category, { status: 201 });
});
