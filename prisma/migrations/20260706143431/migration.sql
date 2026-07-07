-- CreateEnum
CREATE TYPE "SafetyNetStatus" AS ENUM ('ACTIVE', 'OPENED', 'RECEIVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('CREATED', 'CHECKED_IN', 'OPENED_TO_FAMILY', 'RECEIVED', 'CLOSED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "pinHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "stellarAccountId" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StellarAccount" (
    "id" TEXT NOT NULL,
    "publicKey" TEXT NOT NULL,
    "encryptedSecret" TEXT NOT NULL,
    "encryptionIv" TEXT NOT NULL,
    "encryptionTag" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT,

    CONSTRAINT "StellarAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Recipient" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "relationship" TEXT NOT NULL,
    "phone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ownerId" TEXT NOT NULL,
    "stellarAccountId" TEXT NOT NULL,

    CONSTRAINT "Recipient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SafetyNet" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "amount" TEXT NOT NULL,
    "asset" TEXT NOT NULL DEFAULT 'XLM',
    "status" "SafetyNetStatus" NOT NULL DEFAULT 'ACTIVE',
    "balanceId" TEXT,
    "checkInIntervalMinutes" INTEGER NOT NULL DEFAULT 43200,
    "unlockAt" TIMESTAMP(3) NOT NULL,
    "lastCheckInAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "claimCode" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ownerId" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,

    CONSTRAINT "SafetyNet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Activity" (
    "id" TEXT NOT NULL,
    "type" "ActivityType" NOT NULL,
    "description" TEXT NOT NULL,
    "txHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "safetyNetId" TEXT NOT NULL,

    CONSTRAINT "Activity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Setting" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "Setting_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "User_stellarAccountId_key" ON "User"("stellarAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "StellarAccount_publicKey_key" ON "StellarAccount"("publicKey");

-- CreateIndex
CREATE UNIQUE INDEX "StellarAccount_userId_key" ON "StellarAccount"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Recipient_stellarAccountId_key" ON "Recipient"("stellarAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "SafetyNet_claimCode_key" ON "SafetyNet"("claimCode");

-- AddForeignKey
ALTER TABLE "StellarAccount" ADD CONSTRAINT "StellarAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recipient" ADD CONSTRAINT "Recipient_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recipient" ADD CONSTRAINT "Recipient_stellarAccountId_fkey" FOREIGN KEY ("stellarAccountId") REFERENCES "StellarAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SafetyNet" ADD CONSTRAINT "SafetyNet_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SafetyNet" ADD CONSTRAINT "SafetyNet_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "Recipient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_safetyNetId_fkey" FOREIGN KEY ("safetyNetId") REFERENCES "SafetyNet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
