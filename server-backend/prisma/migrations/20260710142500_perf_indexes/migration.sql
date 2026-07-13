-- CreateIndex
CREATE INDEX "SafetyNet_ownerId_idx" ON "SafetyNet"("ownerId");

-- CreateIndex
CREATE INDEX "SafetyNet_ownerId_createdAt_idx" ON "SafetyNet"("ownerId", "createdAt");

-- CreateIndex
CREATE INDEX "Activity_safetyNetId_createdAt_idx" ON "Activity"("safetyNetId", "createdAt");
