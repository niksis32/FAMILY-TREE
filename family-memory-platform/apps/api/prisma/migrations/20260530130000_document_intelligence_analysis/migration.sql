-- Document Intelligence — persist OCR/NER analysis until confirm flows

CREATE TABLE "DocumentIntelligenceAnalysis" (
  "documentId" TEXT NOT NULL,
  "ocr" JSONB,
  "entities" JSONB,
  "events" JSONB,
  "relationships" JSONB,
  "summary" JSONB,
  "rejected" JSONB NOT NULL DEFAULT '[]',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "DocumentIntelligenceAnalysis_pkey" PRIMARY KEY ("documentId")
);

ALTER TABLE "DocumentIntelligenceAnalysis"
  ADD CONSTRAINT "DocumentIntelligenceAnalysis_documentId_fkey"
  FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;
