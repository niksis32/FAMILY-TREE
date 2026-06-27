-- Military conflict approval workflow

CREATE TYPE "MilitaryConflictStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

ALTER TABLE "MilitaryConflictDefinition" DROP CONSTRAINT IF EXISTS "MilitaryConflictDefinition_workspaceId_name_key";

ALTER TABLE "MilitaryConflictDefinition"
  ADD COLUMN "status" "MilitaryConflictStatus" NOT NULL DEFAULT 'PENDING',
  ADD COLUMN "reviewedById" TEXT,
  ADD COLUMN "reviewedAt" TIMESTAMP(3);

UPDATE "MilitaryConflictDefinition" SET "status" = 'APPROVED' WHERE "status" = 'PENDING';

CREATE INDEX "MilitaryConflictDefinition_workspaceId_status_idx" ON "MilitaryConflictDefinition"("workspaceId", "status");

ALTER TABLE "MilitaryConflictDefinition" ADD CONSTRAINT "MilitaryConflictDefinition_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
