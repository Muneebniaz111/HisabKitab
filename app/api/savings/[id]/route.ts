import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUserId } from "@/lib/session";
import { updateSavingSchema } from "@/lib/validations/saving";
import { withAudit } from "@/lib/with-audit";

async function loadOwnedSaving(id: string, userId: string) {
  const saving = await db.saving.findUnique({ where: { id } });
  if (!saving || saving.userId !== userId) return null;
  return saving;
}

export const PATCH = withAudit("saving.update", async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
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
});

export const DELETE = withAudit("saving.delete", async (_request: Request, { params }: { params: Promise<{ id: string }> }) => {
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

  // Re-check the balance in the delete itself: an allocation landing
  // between the check above and this delete would otherwise be lost.
  const { count } = await db.saving.deleteMany({ where: { id, userId, currentAmount: 0 } });
  if (count === 0) {
    return NextResponse.json(
      { error: "Withdraw the remaining funds before deleting this goal." },
      { status: 400 }
    );
  }
  return NextResponse.json({ deleted: true });
});
