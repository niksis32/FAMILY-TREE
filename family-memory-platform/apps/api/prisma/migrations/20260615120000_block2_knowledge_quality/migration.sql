-- BLOCK 2: Knowledge Quality (Search, Hints, Evidence, Merge, Wiki)

CREATE TYPE "HintStatus" AS ENUM ('OPEN', 'ACCEPTED', 'DISMISSED');
CREATE TYPE "HintSource" AS ENUM ('MATCHING', 'DOCUMENT', 'PHOTO', 'GAPS');

ALTER TABLE "Citation" ADD COLUMN "eventId" TEXT;
ALTER TABLE "Citation" ADD COLUMN "qualityScore" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Citation" ADD COLUMN "formattedCitation" TEXT;

CREATE TABLE "SavedSearch" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "filters" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SavedSearch_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SearchHistoryEntry" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "filters" JSONB,
    "resultCount" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SearchHistoryEntry_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Hint" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "source" "HintSource" NOT NULL,
    "status" "HintStatus" NOT NULL DEFAULT 'OPEN',
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "targetEntityType" TEXT,
    "targetEntityId" TEXT,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "resolvedById" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Hint_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HintReason" (
    "id" TEXT NOT NULL,
    "hintId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "detail" JSONB,
    CONSTRAINT "HintReason_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PersonMergeAudit" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "survivorId" TEXT NOT NULL,
    "mergedId" TEXT NOT NULL,
    "performedBy" TEXT NOT NULL,
    "preview" JSONB NOT NULL,
    "snapshot" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PersonMergeAudit_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CitationTemplate" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CitationTemplate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WikiPage" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "familyId" TEXT,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    CONSTRAINT "WikiPage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WikiRevision" (
    "id" TEXT NOT NULL,
    "wikiPageId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "authorUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WikiRevision_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WikiLink" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "fromPageId" TEXT NOT NULL,
    "toPageId" TEXT,
    "toEntityType" TEXT,
    "toEntityId" TEXT,
    CONSTRAINT "WikiLink_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SavedSearch_workspaceId_userId_idx" ON "SavedSearch"("workspaceId", "userId");
CREATE INDEX "SearchHistoryEntry_workspaceId_userId_createdAt_idx" ON "SearchHistoryEntry"("workspaceId", "userId", "createdAt");
CREATE INDEX "Hint_workspaceId_status_idx" ON "Hint"("workspaceId", "status");
CREATE INDEX "Hint_entityType_entityId_idx" ON "Hint"("entityType", "entityId");
CREATE INDEX "Hint_source_status_idx" ON "Hint"("source", "status");
CREATE INDEX "HintReason_hintId_idx" ON "HintReason"("hintId");
CREATE INDEX "PersonMergeAudit_workspaceId_createdAt_idx" ON "PersonMergeAudit"("workspaceId", "createdAt");
CREATE INDEX "PersonMergeAudit_survivorId_idx" ON "PersonMergeAudit"("survivorId");
CREATE INDEX "PersonMergeAudit_mergedId_idx" ON "PersonMergeAudit"("mergedId");
CREATE INDEX "CitationTemplate_workspaceId_idx" ON "CitationTemplate"("workspaceId");
CREATE UNIQUE INDEX "WikiPage_workspaceId_slug_key" ON "WikiPage"("workspaceId", "slug");
CREATE INDEX "WikiPage_familyId_idx" ON "WikiPage"("familyId");
CREATE INDEX "WikiPage_deletedAt_idx" ON "WikiPage"("deletedAt");
CREATE UNIQUE INDEX "WikiRevision_wikiPageId_version_key" ON "WikiRevision"("wikiPageId", "version");
CREATE INDEX "WikiRevision_wikiPageId_idx" ON "WikiRevision"("wikiPageId");
CREATE INDEX "WikiLink_fromPageId_idx" ON "WikiLink"("fromPageId");
CREATE INDEX "WikiLink_toEntityType_toEntityId_idx" ON "WikiLink"("toEntityType", "toEntityId");
CREATE INDEX "Citation_eventId_idx" ON "Citation"("eventId");

ALTER TABLE "Citation" ADD CONSTRAINT "Citation_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SavedSearch" ADD CONSTRAINT "SavedSearch_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SavedSearch" ADD CONSTRAINT "SavedSearch_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SearchHistoryEntry" ADD CONSTRAINT "SearchHistoryEntry_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SearchHistoryEntry" ADD CONSTRAINT "SearchHistoryEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Hint" ADD CONSTRAINT "Hint_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Hint" ADD CONSTRAINT "Hint_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "HintReason" ADD CONSTRAINT "HintReason_hintId_fkey" FOREIGN KEY ("hintId") REFERENCES "Hint"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PersonMergeAudit" ADD CONSTRAINT "PersonMergeAudit_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PersonMergeAudit" ADD CONSTRAINT "PersonMergeAudit_performedBy_fkey" FOREIGN KEY ("performedBy") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CitationTemplate" ADD CONSTRAINT "CitationTemplate_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WikiPage" ADD CONSTRAINT "WikiPage_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WikiPage" ADD CONSTRAINT "WikiPage_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "WikiRevision" ADD CONSTRAINT "WikiRevision_wikiPageId_fkey" FOREIGN KEY ("wikiPageId") REFERENCES "WikiPage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WikiRevision" ADD CONSTRAINT "WikiRevision_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "WikiLink" ADD CONSTRAINT "WikiLink_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WikiLink" ADD CONSTRAINT "WikiLink_fromPageId_fkey" FOREIGN KEY ("fromPageId") REFERENCES "WikiPage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WikiLink" ADD CONSTRAINT "WikiLink_toPageId_fkey" FOREIGN KEY ("toPageId") REFERENCES "WikiPage"("id") ON DELETE SET NULL ON UPDATE CASCADE;
