import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUserId } from "@/lib/session";
import { updateSavingSchema } from "@/lib/validations/saving";

async function loadOwnedSaving(id: string, userId: string) {
  const saving = await db.saving.findUnique({ where: { id } });
  if (!saving || saving.userId !== userId) return null;
  return saving;
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await getCurrentUserId();

  if (!(await loadOwnedSaving(id, userId))) {
    return NextResponse.json({ error: "Saving goal not found" }, { status: 404 });
  }

  const parsed = updateSavingSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { name, targetAmount, targetDate, status } = parsed.data;
  const saving = await db.saving.update({
    where: { id },
    data: { name, targetAmount, targetDate: targetDate ?? null, status },
  });

  return NextResponse.json(saving);
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await getCurrentUserId();

  const saving = await loadOwnedSaving(id, userId);
  if (!saving) {
    return NextResponse.json({ error: "Saving goal not found" }, { status: 404 });
  }

  if (Number(saving.currentAmount) > 0) {
    // Money is still set aside for this goal — withdraw it back to an
    // account first so it isn't silently lost when the goal disappears.
    return NextResponse.json(
      { error: "Withdraw the remaining funds before deleting this goal." },
      { status: 400 }
    );
  }

  await db.saving.delete({ where: { id } });
  return NextResponse.json({ deleted: true });
}
