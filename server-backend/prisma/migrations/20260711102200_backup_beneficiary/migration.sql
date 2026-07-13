-- AlterEnum
ALTER TYPE "SafetyNetStatus" ADD VALUE 'GUARDED';
ALTER TYPE "SafetyNetStatus" ADD VALUE 'BACKUP_RECEIVED';

-- AlterEnum
ALTER TYPE "ActivityType" ADD VALUE 'RECEIVER_CHECKED_IN';
ALTER TYPE "ActivityType" ADD VALUE 'BACKUP_RECEIVED';

-- AlterTable
ALTER TABLE "SafetyNet" ADD COLUMN "backupRecipientId" TEXT,
ADD COLUMN "postReceiptBalanceId" TEXT,
ADD COLUMN "postReceiptUnlockAt" TIMESTAMP(3),
ADD COLUMN "postReceiptLastCheckInAt" TIMESTAMP(3),
ADD COLUMN "postReceiptCheckInIntervalMinutes" INTEGER;

-- AddForeignKey
ALTER TABLE "SafetyNet" ADD CONSTRAINT "SafetyNet_backupRecipientId_fkey" FOREIGN KEY ("backupRecipientId") REFERENCES "Recipient"("id") ON DELETE SET NULL ON UPDATE CASCADE;
