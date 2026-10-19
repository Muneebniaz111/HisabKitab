-- CreateTable
CREATE TABLE "quotes" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "text" TEXT NOT NULL,
    "author" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quotes_pkey" PRIMARY KEY ("id")
);

-- Only the app (table owner, via Prisma) reads this; keep it closed to Supabase's public API.
ALTER TABLE "quotes" ENABLE ROW LEVEL SECURITY;

-- Starter quotes; manage further rows in the database.
INSERT INTO "quotes" ("text", "author") VALUES
  ('Do not save what is left after spending, but spend what is left after saving.', 'Warren Buffett'),
  ('Beware of little expenses; a small leak will sink a great ship.', 'Benjamin Franklin'),
  ('It''s not your salary that makes you rich, it''s your spending habits.', 'Charles A. Jaffe'),
  ('Never spend your money before you have it.', 'Thomas Jefferson'),
  ('No one has ever become poor by giving.', 'Anne Frank'),
  ('A budget is telling your money where to go instead of wondering where it went.', 'Dave Ramsey'),
  ('Wealth consists not in having great possessions, but in having few wants.', 'Epictetus'),
  ('Small amounts saved daily add up to huge investments in the end.', 'Margo Vader'),
  ('Financial freedom is available to those who learn about it and work for it.', 'Robert Kiyosaki'),
  ('He who buys what he does not need steals from himself.', 'Swedish proverb'),
  ('Saving a little today buys you freedom tomorrow.', NULL),
  ('Spend less than you earn, and help someone along the way.', NULL),
  ('Every rupee you save is a step closer to your goal.', NULL),
  ('A planned budget leaves room to be generous.', NULL),
  ('Spend on what matters to you, and cut back mercilessly on what doesn''t.', NULL);
