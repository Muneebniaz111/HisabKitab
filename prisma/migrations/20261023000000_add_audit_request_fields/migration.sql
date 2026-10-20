-- AlterTable
-- Rows written before this migration get an empty method/path; the defaults
-- are then dropped so the columns match the schema (required, no default).
ALTER TABLE "audit_logs" ADD COLUMN     "ipAddress" TEXT,
ADD COLUMN     "method" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "path" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "userAgent" TEXT;

ALTER TABLE "audit_logs" ALTER COLUMN "method" DROP DEFAULT,
ALTER COLUMN "path" DROP DEFAULT;
