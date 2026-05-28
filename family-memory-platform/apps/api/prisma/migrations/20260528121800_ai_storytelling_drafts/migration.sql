-- PROMPT 11 — AI Storytelling drafts

CREATE TYPE "AiStoryType" AS ENUM (
  'PERSON',
  'FAMILY',
  'MIGRATION',
  'DOCUMENT_SUMMARY',
  'TIMELINE_NARRATIVE',
  'ERA_CONTEXT'
);

CREATE TYPE "AiStoryMode" AS ENUM ('DRY_BIOGRAPHY', 'ARTISTIC', 'ARCHIVE', 'FAMILY_BOOK');

CREATE TYPE "AiStoryDraftStatus" AS ENUM ('DRAFT', 'PUBLISHED');

CREATE TABLE "AiStoryDraft" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT,
  "createdById" TEXT NOT NULL,
  "storyType" "AiStoryType" NOT NULL,
  "mode" "AiStoryMode" NOT NULL,
  "status" "AiStoryDraftStatus" NOT NULL DEFAULT 'DRAFT',
  "language" TEXT NOT NULL DEFAULT 'ru',
  "title" TEXT,
  "scopePersonId" TEXT,
  "scopeFamilyId" TEXT,
  "scopeDocumentId" TEXT,
  "narrativeText" TEXT,
  "payloadJson" JSONB NOT NULL,
  "uncertaintyScore" DOUBLE PRECISION,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "AiStoryDraft_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AiStoryDraft_workspaceId_idx" ON "AiStoryDraft"("workspaceId");
CREATE INDEX "AiStoryDraft_createdById_idx" ON "AiStoryDraft"("createdById");
CREATE INDEX "AiStoryDraft_storyType_idx" ON "AiStoryDraft"("storyType");
CREATE INDEX "AiStoryDraft_mode_idx" ON "AiStoryDraft"("mode");
CREATE INDEX "AiStoryDraft_status_idx" ON "AiStoryDraft"("status");
CREATE INDEX "AiStoryDraft_scopePersonId_idx" ON "AiStoryDraft"("scopePersonId");
CREATE INDEX "AiStoryDraft_scopeDocumentId_idx" ON "AiStoryDraft"("scopeDocumentId");
CREATE INDEX "AiStoryDraft_deletedAt_idx" ON "AiStoryDraft"("deletedAt");

ALTER TABLE "AiStoryDraft"
  ADD CONSTRAINT "AiStoryDraft_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AiStoryDraft"
  ADD CONSTRAINT "AiStoryDraft_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

