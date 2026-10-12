-- Shared rate-limit counters (replaces per-process in-memory buckets).
CREATE TABLE "RateLimitBucket" (
    "key" TEXT NOT NULL,
    "hits" INTEGER NOT NULL,
    "resetAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RateLimitBucket_pkey" PRIMARY KEY ("key")
);

CREATE INDEX "RateLimitBucket_resetAt_idx" ON "RateLimitBucket"("resetAt");

-- Lookup paths that previously required sequential scans.
CREATE INDEX "Recipient_ownerId_idx" ON "Recipient"("ownerId");
CREATE INDEX "Recipient_phone_idx" ON "Recipient"("phone");
CREATE INDEX "SafetyNet_recipientId_idx" ON "SafetyNet"("recipientId");
CREATE INDEX "SafetyNet_backupRecipientId_idx" ON "SafetyNet"("backupRecipientId");
CREATE INDEX "SafetyNet_status_unlockAt_idx" ON "SafetyNet"("status", "unlockAt");
CREATE INDEX "PaluwaganContribution_memberId_idx" ON "PaluwaganContribution"("memberId");
