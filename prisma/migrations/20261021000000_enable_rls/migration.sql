-- Close every public-schema table to Supabase's Data API (anon/authenticated roles).
-- Prisma connects as the table owner, which bypasses RLS, so no policies are needed.
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "accounts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "categories" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "transactions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "recurring_transactions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "savings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "saving_transactions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "quotes" ENABLE ROW LEVEL SECURITY;

-- Prisma's migration history table also lives in public and is flagged by the Security Advisor.
ALTER TABLE IF EXISTS "_prisma_migrations" ENABLE ROW LEVEL SECURITY;
