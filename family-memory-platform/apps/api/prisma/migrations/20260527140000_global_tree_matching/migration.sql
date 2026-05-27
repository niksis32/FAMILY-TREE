-- PROMPT 9 — Global Tree Matching (Tenant, Workspace, MatchProfile, candidates)

CREATE TYPE "WorkspaceMemberRole" AS ENUM ('OWNER', 'EDITOR', 'VIEWER');
CREATE TYPE "TreeMatchRunStatus" AS ENUM ('QUEUED', 'RUNNING', 'COMPLETED', 'FAILED', 'SKIPPED');
CREATE TYPE "TreeMatchCandidateStatus" AS ENUM ('NEW', 'ACCEPTED', 'REJECTED', 'NEEDS_REVIEW');

CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Tenant_slug_key" ON "Tenant"("slug");

CREATE TABLE "Workspace" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Workspace_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Workspace_tenantId_idx" ON "Workspace"("tenantId");
CREATE UNIQUE INDEX "Workspace_tenantId_name_key" ON "Workspace"("tenantId", "name");

ALTER TABLE "Workspace" ADD CONSTRAINT "Workspace_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "WorkspaceMember" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "WorkspaceMemberRole" NOT NULL DEFAULT 'EDITOR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "WorkspaceMember_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WorkspaceMember_workspaceId_userId_key" ON "WorkspaceMember"("workspaceId", "userId");
CREATE INDEX "WorkspaceMember_userId_idx" ON "WorkspaceMember"("userId");

ALTER TABLE "WorkspaceMember" ADD CONSTRAINT "WorkspaceMember_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkspaceMember" ADD CONSTRAINT "WorkspaceMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Family" ADD COLUMN "workspaceId" TEXT;
CREATE INDEX "Family_workspaceId_idx" ON "Family"("workspaceId");
ALTER TABLE "Family" ADD CONSTRAINT "Family_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "MatchProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "isOptedIn" BOOLEAN NOT NULL DEFAULT false,
    "optedInAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MatchProfile_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MatchProfile_userId_key" ON "MatchProfile"("userId");
ALTER TABLE "MatchProfile" ADD CONSTRAINT "MatchProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "PersonNameAlias" (
    "id" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "givenName" TEXT,
    "patronymic" TEXT,
    "familyName" TEXT,
    "label" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PersonNameAlias_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PersonNameAlias_personId_idx" ON "PersonNameAlias"("personId");
CREATE INDEX "PersonNameAlias_familyName_givenName_idx" ON "PersonNameAlias"("familyName", "givenName");
ALTER TABLE "PersonNameAlias" ADD CONSTRAINT "PersonNameAlias_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "TreeMatchRun" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "requestedBy" TEXT,
    "status" "TreeMatchRunStatus" NOT NULL DEFAULT 'QUEUED',
    "error" TEXT,
    "stats" JSONB,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TreeMatchRun_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TreeMatchRun_familyId_createdAt_idx" ON "TreeMatchRun"("familyId", "createdAt");
CREATE INDEX "TreeMatchRun_workspaceId_idx" ON "TreeMatchRun"("workspaceId");
CREATE INDEX "TreeMatchRun_status_idx" ON "TreeMatchRun"("status");

ALTER TABLE "TreeMatchRun" ADD CONSTRAINT "TreeMatchRun_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TreeMatchRun" ADD CONSTRAINT "TreeMatchRun_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TreeMatchRun" ADD CONSTRAINT "TreeMatchRun_requestedBy_fkey" FOREIGN KEY ("requestedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "TreeMatchCandidate" (
    "id" TEXT NOT NULL,
    "runId" TEXT,
    "sourcePersonId" TEXT NOT NULL,
    "targetPersonId" TEXT NOT NULL,
    "sourceWorkspaceId" TEXT NOT NULL,
    "targetWorkspaceId" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "reasons" JSONB NOT NULL,
    "status" "TreeMatchCandidateStatus" NOT NULL DEFAULT 'NEW',
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TreeMatchCandidate_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TreeMatchCandidate_sourcePersonId_targetPersonId_key" ON "TreeMatchCandidate"("sourcePersonId", "targetPersonId");
CREATE INDEX "TreeMatchCandidate_sourcePersonId_status_idx" ON "TreeMatchCandidate"("sourcePersonId", "status");
CREATE INDEX "TreeMatchCandidate_targetPersonId_idx" ON "TreeMatchCandidate"("targetPersonId");
CREATE INDEX "TreeMatchCandidate_runId_idx" ON "TreeMatchCandidate"("runId");
CREATE INDEX "TreeMatchCandidate_status_score_idx" ON "TreeMatchCandidate"("status", "score");

ALTER TABLE "TreeMatchCandidate" ADD CONSTRAINT "TreeMatchCandidate_runId_fkey" FOREIGN KEY ("runId") REFERENCES "TreeMatchRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TreeMatchCandidate" ADD CONSTRAINT "TreeMatchCandidate_sourcePersonId_fkey" FOREIGN KEY ("sourcePersonId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TreeMatchCandidate" ADD CONSTRAINT "TreeMatchCandidate_targetPersonId_fkey" FOREIGN KEY ("targetPersonId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TreeMatchCandidate" ADD CONSTRAINT "TreeMatchCandidate_reviewedBy_fkey" FOREIGN KEY ("reviewedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
