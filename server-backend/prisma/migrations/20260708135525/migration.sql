-- CreateTable
CREATE TABLE "PaluwaganGroup" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "contributionAmount" TEXT NOT NULL,
    "frequencyMinutes" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "inviteCode" TEXT NOT NULL,
    "currentCycle" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaluwaganGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaluwaganMember" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'MEMBER',
    "payoutPosition" INTEGER NOT NULL,
    "walletId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaluwaganMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaluwaganCycle" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "cycleNumber" INTEGER NOT NULL,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "payoutMemberId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'UPCOMING',

    CONSTRAINT "PaluwaganCycle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaluwaganContribution" (
    "id" TEXT NOT NULL,
    "cycleId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "amount" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DUE',
    "paidAt" TIMESTAMP(3),
    "txHash" TEXT,

    CONSTRAINT "PaluwaganContribution_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PaluwaganGroup_inviteCode_key" ON "PaluwaganGroup"("inviteCode");

-- CreateIndex
CREATE INDEX "PaluwaganGroup_ownerId_idx" ON "PaluwaganGroup"("ownerId");

-- CreateIndex
CREATE INDEX "PaluwaganMember_userId_idx" ON "PaluwaganMember"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PaluwaganMember_groupId_userId_key" ON "PaluwaganMember"("groupId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "PaluwaganCycle_groupId_cycleNumber_key" ON "PaluwaganCycle"("groupId", "cycleNumber");

-- CreateIndex
CREATE UNIQUE INDEX "PaluwaganContribution_cycleId_memberId_key" ON "PaluwaganContribution"("cycleId", "memberId");

-- AddForeignKey
ALTER TABLE "PaluwaganMember" ADD CONSTRAINT "PaluwaganMember_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "PaluwaganGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaluwaganCycle" ADD CONSTRAINT "PaluwaganCycle_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "PaluwaganGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaluwaganContribution" ADD CONSTRAINT "PaluwaganContribution_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "PaluwaganCycle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaluwaganContribution" ADD CONSTRAINT "PaluwaganContribution_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "PaluwaganMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;
