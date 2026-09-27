import { db } from "@/lib/db";
import { DEFAULT_INCOME_CATEGORIES, DEFAULT_EXPENSE_CATEGORIES } from "@/lib/constants/categories";

/**
 * Seeds the default category set (requirements.docx §4) the first time a
 * user has zero categories. Idempotent — safe to call on every categories
 * fetch. Full category management (rename/delete/reorder) is Phase 6; this
 * just guarantees the transaction form always has something to select.
 */
export async function ensureDefaultCategories(userId: string) {
  const existing = await db.category.count({ where: { userId } });
  if (existing > 0) return;

  await db.category.createMany({
    data: [
      ...DEFAULT_INCOME_CATEGORIES.map((name) => ({ userId, name, kind: "INCOME" as const })),
      ...DEFAULT_EXPENSE_CATEGORIES.map((name) => ({ userId, name, kind: "EXPENSE" as const })),
    ],
    skipDuplicates: true,
  });
}
