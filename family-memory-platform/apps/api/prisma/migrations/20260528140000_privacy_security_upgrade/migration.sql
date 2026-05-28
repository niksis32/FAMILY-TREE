-- PROMPT 13 — Privacy & Security Upgrade

CREATE TYPE "PublicShareResourceType" AS ENUM ('PERSON', 'FAMILY_TREE', 'MEDIA_BUNDLE', 'FAMILY_STORY');
CREATE TYPE "AccessLogAction" AS ENUM ('VIEW', 'EXPORT', 'AI_INFERENCE', 'PUBLIC_LINK_OPEN');
CREATE TYPE "UserConsentKey" AS ENUM ('GDPR_DATA_PROCESSING', 'GLOBAL_MATCHING', 'AI_LOCAL_PROCESSING');

ALTER TABLE "Person" ALTER COLUMN "privacyLevel" SET DEFAULT 'PRIVATE';

ALTER TABLE "Family" ADD COLUMN "hideLivingPersons" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Family" ADD COLUMN "treePrivacyLevel" "PrivacyLevel" NOT NULL DEFAULT 'PRIVATE';

ALTER TABLE "Media" ADD COLUMN "privacyLevel" "PrivacyLevel" NOT NULL DEFAULT 'PRIVATE';
CREATE INDEX "Media_privacyLevel_idx" ON "Media"("privacyLevel");

ALTER TABLE "Document" ADD COLUMN "privacyLevel" "PrivacyLevel" NOT NULL DEFAULT 'FAMILY';
CREATE INDEX "Document_privacyLevel_idx" ON "Document"("privacyLevel");

CREATE TABLE "PublicShare" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT,
    "createdById" TEXT NOT NULL,
    "resourceType" "PublicShareResourceType" NOT NULL,
    "resourceId" TEXT NOT NULL,
    "familyStoryId" TEXT,
    "label" TEXT,
    "publicTokenHash" TEXT NOT NULL,
    "hideLivingPersons" BOOLEAN NOT NULL DEFAULT true,
    "tokenRevokedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PublicShare_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PublicShare_publicTokenHash_key" ON "PublicShare"("publicTokenHash");
CREATE INDEX "PublicShare_workspaceId_idx" ON "PublicShare"("workspaceId");
CREATE INDEX "PublicShare_createdById_idx" ON "PublicShare"("createdById");
CREATE INDEX "PublicShare_resourceType_resourceId_idx" ON "PublicShare"("resourceType", "resourceId");

ALTER TABLE "PublicShare" ADD CONSTRAINT "PublicShare_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PublicShare" ADD CONSTRAINT "PublicShare_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "AccessLog" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT,
    "userId" TEXT,
    "publicShareId" TEXT,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT,
    "action" "AccessLogAction" NOT NULL,
    "ipHash" TEXT,
    "userAgent" VARCHAR(512),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AccessLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AccessLog_workspaceId_createdAt_idx" ON "AccessLog"("workspaceId", "createdAt");
CREATE INDEX "AccessLog_userId_createdAt_idx" ON "AccessLog"("userId", "createdAt");
CREATE INDEX "AccessLog_publicShareId_idx" ON "AccessLog"("publicShareId");
CREATE INDEX "AccessLog_resourceType_resourceId_idx" ON "AccessLog"("resourceType", "resourceId");
CREATE INDEX "AccessLog_createdAt_idx" ON "AccessLog"("createdAt");

ALTER TABLE "AccessLog" ADD CONSTRAINT "AccessLog_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AccessLog" ADD CONSTRAINT "AccessLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AccessLog" ADD CONSTRAINT "AccessLog_publicShareId_fkey" FOREIGN KEY ("publicShareId") REFERENCES "PublicShare"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "UserConsent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "consentKey" "UserConsentKey" NOT NULL,
    "granted" BOOLEAN NOT NULL DEFAULT false,
    "version" TEXT NOT NULL DEFAULT '1',
    "grantedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "UserConsent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserConsent_userId_consentKey_key" ON "UserConsent"("userId", "consentKey");
CREATE INDEX "UserConsent_userId_idx" ON "UserConsent"("userId");

ALTER TABLE "UserConsent" ADD CONSTRAINT "UserConsent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
