-- Document OCR pipeline — BullMQ job tracking

CREATE TABLE "DocumentOcrJob" (
  "id" TEXT NOT NULL,
  "documentId" TEXT NOT NULL,
  "status" "PhotoAnalysisStatus" NOT NULL DEFAULT 'QUEUED',
  "error" TEXT,
  "requestedBy" TEXT,
  "language" TEXT NOT NULL DEFAULT 'ru',
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "DocumentOcrJob_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DocumentOcrJob_documentId_createdAt_idx" ON "DocumentOcrJob"("documentId", "createdAt");
CREATE INDEX "DocumentOcrJob_status_idx" ON "DocumentOcrJob"("status");

ALTER TABLE "DocumentOcrJob"
  ADD CONSTRAINT "DocumentOcrJob_documentId_fkey"
  FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;
