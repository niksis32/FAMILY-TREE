-- BLOCK 5 PROMPT 5-F: public memorial share + DNA match candidates

-- AlterTable
ALTER TABLE "Memorial" ADD COLUMN "shareToken" TEXT,
ADD COLUMN "shareEnabled" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX "Memorial_shareToken_key" ON "Memorial"("shareToken");

-- CreateEnum
CREATE TYPE "DnaMatchStatus" AS ENUM ('SUGGESTED', 'DISMISSED');

-- CreateTable
CREATE TABLE "DnaMatchCandidate" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "profileUserId" TEXT NOT NULL,
    "displayLabel" TEXT NOT NULL,
    "sharedSegments" INTEGER NOT NULL DEFAULT 0,
    "totalCm" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" "DnaMatchStatus" NOT NULL DEFAULT 'SUGGESTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DnaMatchCandidate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DnaMatchCandidate_workspaceId_profileUserId_idx" ON "DnaMatchCandidate"("workspaceId", "profileUserId");

-- AddForeignKey
ALTER TABLE "DnaMatchCandidate" ADD CONSTRAINT "DnaMatchCandidate_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
