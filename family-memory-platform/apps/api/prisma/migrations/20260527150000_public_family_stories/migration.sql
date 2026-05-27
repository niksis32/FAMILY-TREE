-- PROMPT 10 — Public Family Stories

CREATE TYPE "StoryVisibility" AS ENUM ('PUBLIC', 'PRIVATE', 'FAMILY_ONLY', 'LINK_ONLY');
CREATE TYPE "FamilyStoryTemplate" AS ENUM ('CLASSIC', 'HERITAGE', 'JOURNEY', 'GALLERY');
CREATE TYPE "FamilyStoryScopeType" AS ENUM ('PERSON', 'FAMILY_BRANCH');

CREATE TABLE "FamilyStory" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT,
    "createdById" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT,
    "template" "FamilyStoryTemplate" NOT NULL DEFAULT 'CLASSIC',
    "visibility" "StoryVisibility" NOT NULL DEFAULT 'LINK_ONLY',
    "publicTokenHash" TEXT NOT NULL,
    "narrativeText" TEXT,
    "narrativeGeneratedAt" TIMESTAMP(3),
    "hideLivingPersons" BOOLEAN NOT NULL DEFAULT true,
    "scopeType" "FamilyStoryScopeType" NOT NULL,
    "scopePersonId" TEXT,
    "scopeFamilyId" TEXT,
    "configJson" JSONB NOT NULL,
    "coverMediaId" TEXT,
    "ogDescription" VARCHAR(500),
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "lastViewedAt" TIMESTAMP(3),
    "tokenRevokedAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "FamilyStory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FamilyStoryView" (
    "id" TEXT NOT NULL,
    "storyId" TEXT NOT NULL,
    "viewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "viewerIpHash" TEXT,
    "userAgent" VARCHAR(512),

    CONSTRAINT "FamilyStoryView_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FamilyStory_slug_key" ON "FamilyStory"("slug");
CREATE UNIQUE INDEX "FamilyStory_publicTokenHash_key" ON "FamilyStory"("publicTokenHash");
CREATE INDEX "FamilyStory_workspaceId_idx" ON "FamilyStory"("workspaceId");
CREATE INDEX "FamilyStory_createdById_idx" ON "FamilyStory"("createdById");
CREATE INDEX "FamilyStory_visibility_idx" ON "FamilyStory"("visibility");
CREATE INDEX "FamilyStory_deletedAt_idx" ON "FamilyStory"("deletedAt");
CREATE INDEX "FamilyStoryView_storyId_viewedAt_idx" ON "FamilyStoryView"("storyId", "viewedAt");

ALTER TABLE "FamilyStory" ADD CONSTRAINT "FamilyStory_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FamilyStory" ADD CONSTRAINT "FamilyStory_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FamilyStoryView" ADD CONSTRAINT "FamilyStoryView_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "FamilyStory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
