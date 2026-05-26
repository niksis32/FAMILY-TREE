-- CreateEnum
CREATE TYPE "FaceTagSource" AS ENUM ('MANUAL', 'AI');

-- CreateEnum
CREATE TYPE "PhotoAnalysisStatus" AS ENUM ('QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED', 'SKIPPED');

-- CreateTable
CREATE TABLE "PhotoFaceTag" (
    "id" TEXT NOT NULL,
    "mediaId" TEXT NOT NULL,
    "personId" TEXT,
    "x" DOUBLE PRECISION NOT NULL,
    "y" DOUBLE PRECISION NOT NULL,
    "width" DOUBLE PRECISION NOT NULL,
    "height" DOUBLE PRECISION NOT NULL,
    "confidence" DOUBLE PRECISION,
    "label" TEXT,
    "note" TEXT,
    "source" "FaceTagSource" NOT NULL DEFAULT 'MANUAL',
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PhotoFaceTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PhotoInsight" (
    "id" TEXT NOT NULL,
    "mediaId" TEXT NOT NULL,
    "estimatedYearFrom" INTEGER,
    "estimatedYearTo" INTEGER,
    "detectedObjects" JSONB,
    "detectedClothingStyle" TEXT,
    "aiDescription" TEXT,
    "uncertaintyNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PhotoInsight_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaComment" (
    "id" TEXT NOT NULL,
    "mediaId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MediaComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PhotoAnalysisJob" (
    "id" TEXT NOT NULL,
    "mediaId" TEXT NOT NULL,
    "status" "PhotoAnalysisStatus" NOT NULL DEFAULT 'QUEUED',
    "error" TEXT,
    "requestedBy" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PhotoAnalysisJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PhotoFaceTag_mediaId_idx" ON "PhotoFaceTag"("mediaId");

-- CreateIndex
CREATE INDEX "PhotoFaceTag_personId_idx" ON "PhotoFaceTag"("personId");

-- CreateIndex
CREATE INDEX "PhotoFaceTag_createdBy_idx" ON "PhotoFaceTag"("createdBy");

-- CreateIndex
CREATE UNIQUE INDEX "PhotoInsight_mediaId_key" ON "PhotoInsight"("mediaId");

-- CreateIndex
CREATE INDEX "PhotoInsight_estimatedYearFrom_estimatedYearTo_idx" ON "PhotoInsight"("estimatedYearFrom", "estimatedYearTo");

-- CreateIndex
CREATE INDEX "MediaComment_mediaId_createdAt_idx" ON "MediaComment"("mediaId", "createdAt");

-- CreateIndex
CREATE INDEX "MediaComment_authorId_idx" ON "MediaComment"("authorId");

-- CreateIndex
CREATE INDEX "PhotoAnalysisJob_mediaId_createdAt_idx" ON "PhotoAnalysisJob"("mediaId", "createdAt");

-- CreateIndex
CREATE INDEX "PhotoAnalysisJob_status_idx" ON "PhotoAnalysisJob"("status");

-- AddForeignKey
ALTER TABLE "PhotoFaceTag" ADD CONSTRAINT "PhotoFaceTag_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "Media"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhotoFaceTag" ADD CONSTRAINT "PhotoFaceTag_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhotoFaceTag" ADD CONSTRAINT "PhotoFaceTag_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhotoInsight" ADD CONSTRAINT "PhotoInsight_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "Media"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaComment" ADD CONSTRAINT "MediaComment_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "Media"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaComment" ADD CONSTRAINT "MediaComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhotoAnalysisJob" ADD CONSTRAINT "PhotoAnalysisJob_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "Media"("id") ON DELETE CASCADE ON UPDATE CASCADE;
