-- AlterTable
ALTER TABLE "recurring_transactions" ADD COLUMN     "reminderSentAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "lastSavingsReminderAt" TIMESTAMP(3);
