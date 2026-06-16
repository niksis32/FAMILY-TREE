-- BLOCK 5: Branding, PDF export, DNA import, Cemetery

ALTER TYPE "UserConsentKey" ADD VALUE IF NOT EXISTS 'DNA_DATA_IMPORT';

CREATE TYPE "PdfExportTemplateCode" AS ENUM ('FAMILY_BOOK_STANDARD', 'TREE_POSTER_A3');
CREATE TYPE "PdfExportJobStatus" AS ENUM ('QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED');
CREATE TYPE "DnaProvider" AS ENUM ('TWENTY_THREE_AND_ME', 'ANCESTRY', 'UNKNOWN');
CREATE TYPE "DnaImportJobStatus" AS ENUM ('QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED');

CREATE TABLE "WorkspaceBranding" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "displayName" TEXT,
    "logoStorageKey" TEXT,
    "logoBucket" TEXT,
    "primaryColor" TEXT DEFAULT '#2d5a27',
    "secondaryColor" TEXT,
    "customDomain" TEXT,
    "domainVerified" BOOLEAN NOT NULL DEFAULT false,
    "domainVerifyToken" TEXT,
    "faviconUrl" TEXT,
    "footerText" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkspaceBranding_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PdfExportJob" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "templateCode" "PdfExportTemplateCode" NOT NULL,
    "rootPersonId" TEXT,
    "status" "PdfExportJobStatus" NOT NULL DEFAULT 'QUEUED',
    "objectKey" TEXT,
    "downloadUrl" TEXT,
    "downloadExpiresAt" TIMESTAMP(3),
    "previewHtml" TEXT,
    "error" TEXT,
    "options" JSONB,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PdfExportJob_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DnaProfile" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" "DnaProvider" NOT NULL DEFAULT 'UNKNOWN',
    "snpCount" INTEGER NOT NULL DEFAULT 0,
    "fileKey" TEXT,
    "fileName" TEXT,
    "importedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DnaProfile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DnaImportJob" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "DnaImportJobStatus" NOT NULL DEFAULT 'QUEUED',
    "fileKey" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "provider" "DnaProvider",
    "snpCount" INTEGER,
    "error" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DnaImportJob_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Cemetery" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cemetery_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BurialSite" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "cemeteryId" TEXT NOT NULL,
    "personId" TEXT,
    "plotLabel" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "burialDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BurialSite_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Memorial" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "burialSiteId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "inscription" TEXT,
    "photoMediaId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Memorial_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WorkspaceBranding_workspaceId_key" ON "WorkspaceBranding"("workspaceId");
CREATE UNIQUE INDEX "WorkspaceBranding_customDomain_key" ON "WorkspaceBranding"("customDomain");

CREATE INDEX "PdfExportJob_workspaceId_status_idx" ON "PdfExportJob"("workspaceId", "status");
CREATE INDEX "PdfExportJob_requestedById_idx" ON "PdfExportJob"("requestedById");

CREATE UNIQUE INDEX "DnaProfile_workspaceId_userId_key" ON "DnaProfile"("workspaceId", "userId");
CREATE INDEX "DnaProfile_userId_idx" ON "DnaProfile"("userId");

CREATE INDEX "DnaImportJob_workspaceId_status_idx" ON "DnaImportJob"("workspaceId", "status");
CREATE INDEX "DnaImportJob_userId_idx" ON "DnaImportJob"("userId");

CREATE INDEX "Cemetery_workspaceId_idx" ON "Cemetery"("workspaceId");
CREATE INDEX "BurialSite_workspaceId_idx" ON "BurialSite"("workspaceId");
CREATE INDEX "BurialSite_cemeteryId_idx" ON "BurialSite"("cemeteryId");
CREATE INDEX "BurialSite_personId_idx" ON "BurialSite"("personId");
CREATE INDEX "Memorial_workspaceId_idx" ON "Memorial"("workspaceId");
CREATE INDEX "Memorial_burialSiteId_idx" ON "Memorial"("burialSiteId");

ALTER TABLE "WorkspaceBranding" ADD CONSTRAINT "WorkspaceBranding_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PdfExportJob" ADD CONSTRAINT "PdfExportJob_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PdfExportJob" ADD CONSTRAINT "PdfExportJob_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DnaProfile" ADD CONSTRAINT "DnaProfile_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DnaProfile" ADD CONSTRAINT "DnaProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DnaImportJob" ADD CONSTRAINT "DnaImportJob_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DnaImportJob" ADD CONSTRAINT "DnaImportJob_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Cemetery" ADD CONSTRAINT "Cemetery_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BurialSite" ADD CONSTRAINT "BurialSite_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BurialSite" ADD CONSTRAINT "BurialSite_cemeteryId_fkey" FOREIGN KEY ("cemeteryId") REFERENCES "Cemetery"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BurialSite" ADD CONSTRAINT "BurialSite_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Memorial" ADD CONSTRAINT "Memorial_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Memorial" ADD CONSTRAINT "Memorial_burialSiteId_fkey" FOREIGN KEY ("burialSiteId") REFERENCES "BurialSite"("id") ON DELETE CASCADE ON UPDATE CASCADE;
