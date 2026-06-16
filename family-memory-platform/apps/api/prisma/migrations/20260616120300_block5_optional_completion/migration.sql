-- Block 5 optional completion: A2 export, family branch scope, photogrammetry queue

ALTER TYPE "PdfExportTemplateCode" ADD VALUE IF NOT EXISTS 'FAMILY_BOOK_A2';

ALTER TABLE "PdfExportJob" ADD COLUMN IF NOT EXISTS "familyId" TEXT;

CREATE TYPE "BurialPhotogrammetryStatus" AS ENUM ('QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED');

CREATE TABLE "BurialPhotogrammetryJob" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "burialSiteId" TEXT NOT NULL,
  "sourceMediaId" TEXT,
  "status" "BurialPhotogrammetryStatus" NOT NULL DEFAULT 'QUEUED',
  "sceneJson" JSONB,
  "error" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "completedAt" TIMESTAMP(3),

  CONSTRAINT "BurialPhotogrammetryJob_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "BurialPhotogrammetryJob_workspaceId_burialSiteId_idx" ON "BurialPhotogrammetryJob"("workspaceId", "burialSiteId");
CREATE INDEX "BurialPhotogrammetryJob_burialSiteId_idx" ON "BurialPhotogrammetryJob"("burialSiteId");

ALTER TABLE "BurialPhotogrammetryJob" ADD CONSTRAINT "BurialPhotogrammetryJob_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BurialPhotogrammetryJob" ADD CONSTRAINT "BurialPhotogrammetryJob_burialSiteId_fkey"
  FOREIGN KEY ("burialSiteId") REFERENCES "BurialSite"("id") ON DELETE CASCADE ON UPDATE CASCADE;
