-- BLOCK 3: Media & AI Memory Engine

-- CreateEnum
CREATE TYPE "FaceClusterStatus" AS ENUM ('UNREVIEWED', 'CONFIRMED', 'ASSIGNED', 'MERGED', 'ARCHIVED');
CREATE TYPE "FaceEmbeddingStatus" AS ENUM ('PENDING', 'READY', 'FAILED', 'SKIPPED');
CREATE TYPE "MemoryStoryStatus" AS ENUM ('DRAFT', 'UPLOADING', 'PROCESSING', 'READY', 'FAILED');
CREATE TYPE "MediaTranscriptStatus" AS ENUM ('QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED', 'SKIPPED');
CREATE TYPE "SocialArchiveProvider" AS ENUM ('INSTAGRAM', 'FACEBOOK', 'TWITTER', 'VK', 'ODNOKLASSNIKI', 'TELEGRAM', 'UNKNOWN');
CREATE TYPE "SocialArchiveImportStatus" AS ENUM ('UPLOADED', 'PARSING', 'PREVIEW_READY', 'PARSE_FAILED', 'CONFIRMING', 'COMPLETED', 'CONFIRM_FAILED', 'EXPIRED', 'CANCELLED');
CREATE TYPE "SocialArchiveItemKind" AS ENUM ('PHOTO', 'VIDEO', 'POST_WITH_MEDIA', 'STORY');
CREATE TYPE "SocialArchiveItemStatus" AS ENUM ('STAGED', 'SELECTED', 'IMPORTED', 'SKIPPED', 'FAILED');

-- AlterTable Media
ALTER TABLE "Media" ADD COLUMN "importSource" TEXT;
ALTER TABLE "Media" ADD COLUMN "externalPostId" TEXT;
ALTER TABLE "Media" ADD COLUMN "durationSeconds" DOUBLE PRECISION;
ALTER TABLE "Media" ADD COLUMN "posterStorageKey" TEXT;
ALTER TABLE "Media" ADD COLUMN "audioDerivativeKey" TEXT;
CREATE INDEX "Media_importSource_externalPostId_idx" ON "Media"("importSource", "externalPostId");

-- AlterTable DocumentOcrJob
ALTER TABLE "DocumentOcrJob" ADD COLUMN "detectedLanguage" TEXT;
ALTER TABLE "DocumentOcrJob" ADD COLUMN "averageConfidence" DOUBLE PRECISION;

-- CreateTable FaceEmbedding
CREATE TABLE "FaceEmbedding" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "faceTagId" TEXT NOT NULL,
    "vectorJson" JSONB NOT NULL,
    "model" TEXT NOT NULL DEFAULT 'mvp-hash-v1',
    "status" "FaceEmbeddingStatus" NOT NULL DEFAULT 'PENDING',
    "qualityScore" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "FaceEmbedding_pkey" PRIMARY KEY ("id")
);

-- CreateTable FaceCluster
CREATE TABLE "FaceCluster" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "status" "FaceClusterStatus" NOT NULL DEFAULT 'UNREVIEWED',
    "personId" TEXT,
    "label" TEXT,
    "memberCount" INTEGER NOT NULL DEFAULT 0,
    "representativeEmbeddingId" TEXT,
    "lastRebuildAt" TIMESTAMP(3),
    "assignedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "FaceCluster_pkey" PRIMARY KEY ("id")
);

-- CreateTable FaceClusterMember
CREATE TABLE "FaceClusterMember" (
    "id" TEXT NOT NULL,
    "clusterId" TEXT NOT NULL,
    "embeddingId" TEXT NOT NULL,
    "distanceToCentroid" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isRepresentative" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "FaceClusterMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable MemoryStory
CREATE TABLE "MemoryStory" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "mediaId" TEXT,
    "subjectPersonId" TEXT NOT NULL,
    "narratorPersonId" TEXT,
    "language" TEXT NOT NULL DEFAULT 'ru',
    "status" "MemoryStoryStatus" NOT NULL DEFAULT 'DRAFT',
    "summary" TEXT,
    "mentionedPersonIds" JSONB,
    "recordedAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    CONSTRAINT "MemoryStory_pkey" PRIMARY KEY ("id")
);

-- CreateTable MediaTranscript
CREATE TABLE "MediaTranscript" (
    "id" TEXT NOT NULL,
    "mediaId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "segments" JSONB,
    "language" TEXT NOT NULL DEFAULT 'ru',
    "confidence" DOUBLE PRECISION,
    "editedAt" TIMESTAMP(3),
    "editedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MediaTranscript_pkey" PRIMARY KEY ("id")
);

-- CreateTable MediaTranscriptJob
CREATE TABLE "MediaTranscriptJob" (
    "id" TEXT NOT NULL,
    "mediaId" TEXT NOT NULL,
    "memoryStoryId" TEXT,
    "status" "MediaTranscriptStatus" NOT NULL DEFAULT 'QUEUED',
    "error" TEXT,
    "requestedBy" TEXT,
    "language" TEXT NOT NULL DEFAULT 'ru',
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MediaTranscriptJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable SocialArchiveImport
CREATE TABLE "SocialArchiveImport" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "provider" "SocialArchiveProvider" NOT NULL DEFAULT 'UNKNOWN',
    "status" "SocialArchiveImportStatus" NOT NULL DEFAULT 'UPLOADED',
    "fileName" TEXT NOT NULL,
    "stagingKey" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "parsedCount" INTEGER NOT NULL DEFAULT 0,
    "selectedCount" INTEGER NOT NULL DEFAULT 0,
    "importedCount" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SocialArchiveImport_pkey" PRIMARY KEY ("id")
);

-- CreateTable SocialArchiveItem
CREATE TABLE "SocialArchiveItem" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "importId" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "kind" "SocialArchiveItemKind" NOT NULL DEFAULT 'PHOTO',
    "title" TEXT,
    "caption" TEXT,
    "takenAt" TIMESTAMP(3),
    "stagingMediaKey" TEXT,
    "privacyFlags" JSONB NOT NULL DEFAULT '[]',
    "status" "SocialArchiveItemStatus" NOT NULL DEFAULT 'STAGED',
    "selected" BOOLEAN NOT NULL DEFAULT false,
    "committedMediaId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SocialArchiveItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FaceEmbedding_faceTagId_key" ON "FaceEmbedding"("faceTagId");
CREATE INDEX "FaceEmbedding_workspaceId_status_idx" ON "FaceEmbedding"("workspaceId", "status");
CREATE INDEX "FaceCluster_workspaceId_status_memberCount_idx" ON "FaceCluster"("workspaceId", "status", "memberCount");
CREATE UNIQUE INDEX "FaceClusterMember_embeddingId_key" ON "FaceClusterMember"("embeddingId");
CREATE INDEX "FaceClusterMember_clusterId_idx" ON "FaceClusterMember"("clusterId");
CREATE INDEX "MemoryStory_workspaceId_status_idx" ON "MemoryStory"("workspaceId", "status");
CREATE INDEX "MemoryStory_subjectPersonId_idx" ON "MemoryStory"("subjectPersonId");
CREATE INDEX "MemoryStory_deletedAt_idx" ON "MemoryStory"("deletedAt");
CREATE UNIQUE INDEX "MediaTranscript_mediaId_key" ON "MediaTranscript"("mediaId");
CREATE INDEX "MediaTranscriptJob_mediaId_createdAt_idx" ON "MediaTranscriptJob"("mediaId", "createdAt");
CREATE INDEX "MediaTranscriptJob_status_idx" ON "MediaTranscriptJob"("status");
CREATE INDEX "SocialArchiveImport_workspaceId_status_createdAt_idx" ON "SocialArchiveImport"("workspaceId", "status", "createdAt");
CREATE INDEX "SocialArchiveImport_expiresAt_idx" ON "SocialArchiveImport"("expiresAt");
CREATE UNIQUE INDEX "SocialArchiveItem_importId_externalId_key" ON "SocialArchiveItem"("importId", "externalId");
CREATE INDEX "SocialArchiveItem_importId_status_idx" ON "SocialArchiveItem"("importId", "status");
CREATE INDEX "SocialArchiveItem_workspaceId_idx" ON "SocialArchiveItem"("workspaceId");

-- AddForeignKey
ALTER TABLE "FaceEmbedding" ADD CONSTRAINT "FaceEmbedding_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FaceEmbedding" ADD CONSTRAINT "FaceEmbedding_faceTagId_fkey" FOREIGN KEY ("faceTagId") REFERENCES "PhotoFaceTag"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FaceCluster" ADD CONSTRAINT "FaceCluster_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FaceCluster" ADD CONSTRAINT "FaceCluster_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FaceClusterMember" ADD CONSTRAINT "FaceClusterMember_clusterId_fkey" FOREIGN KEY ("clusterId") REFERENCES "FaceCluster"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FaceClusterMember" ADD CONSTRAINT "FaceClusterMember_embeddingId_fkey" FOREIGN KEY ("embeddingId") REFERENCES "FaceEmbedding"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MemoryStory" ADD CONSTRAINT "MemoryStory_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MemoryStory" ADD CONSTRAINT "MemoryStory_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "Media"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MemoryStory" ADD CONSTRAINT "MemoryStory_subjectPersonId_fkey" FOREIGN KEY ("subjectPersonId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MemoryStory" ADD CONSTRAINT "MemoryStory_narratorPersonId_fkey" FOREIGN KEY ("narratorPersonId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MemoryStory" ADD CONSTRAINT "MemoryStory_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MediaTranscript" ADD CONSTRAINT "MediaTranscript_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "Media"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MediaTranscriptJob" ADD CONSTRAINT "MediaTranscriptJob_memoryStoryId_fkey" FOREIGN KEY ("memoryStoryId") REFERENCES "MemoryStory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SocialArchiveImport" ADD CONSTRAINT "SocialArchiveImport_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SocialArchiveImport" ADD CONSTRAINT "SocialArchiveImport_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SocialArchiveItem" ADD CONSTRAINT "SocialArchiveItem_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SocialArchiveItem" ADD CONSTRAINT "SocialArchiveItem_importId_fkey" FOREIGN KEY ("importId") REFERENCES "SocialArchiveImport"("id") ON DELETE CASCADE ON UPDATE CASCADE;
