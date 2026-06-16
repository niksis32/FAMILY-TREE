-- BLOCK 5: External Archives Integration

ALTER TABLE "Source"
  ADD COLUMN "externalProvider" TEXT,
  ADD COLUMN "externalRecordId" TEXT,
  ADD COLUMN "attributionText" TEXT;

CREATE UNIQUE INDEX "Source_workspaceId_externalProvider_externalRecordId_key"
  ON "Source"("workspaceId", "externalProvider", "externalRecordId");

CREATE INDEX "Source_externalProvider_externalRecordId_idx"
  ON "Source"("externalProvider", "externalRecordId");

ALTER TYPE "HintSource" ADD VALUE 'EXTERNAL_ARCHIVE';

CREATE TYPE "ArchiveSearchStatus" AS ENUM ('QUEUED', 'RUNNING', 'COMPLETED', 'FAILED', 'SKIPPED');

CREATE TABLE "ArchiveSearch" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "status" "ArchiveSearchStatus" NOT NULL DEFAULT 'QUEUED',
  "query" JSONB NOT NULL,
  "results" JSONB,
  "resultCount" INTEGER,
  "error" TEXT,
  "requestedById" TEXT NOT NULL,
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ArchiveSearch_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ArchiveSearch_workspaceId_createdAt_idx" ON "ArchiveSearch"("workspaceId", "createdAt");
CREATE INDEX "ArchiveSearch_status_idx" ON "ArchiveSearch"("status");

ALTER TABLE "ArchiveSearch"
  ADD CONSTRAINT "ArchiveSearch_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ArchiveSearch"
  ADD CONSTRAINT "ArchiveSearch_requestedById_fkey"
  FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
