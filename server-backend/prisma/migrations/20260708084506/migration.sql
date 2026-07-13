-- AlterTable
ALTER TABLE "SafetyNet" ADD COLUMN     "kind" TEXT NOT NULL DEFAULT 'SAFETY_NET',
ADD COLUMN     "requestState" TEXT NOT NULL DEFAULT 'NONE';

-- CreateTable
CREATE TABLE "Pot" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "target" TEXT NOT NULL,
    "saved" TEXT NOT NULL DEFAULT '0',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Pot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Pot_userId_idx" ON "Pot"("userId");
