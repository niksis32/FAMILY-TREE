-- PROMPT 10 — moderation before publish + publish workflow

CREATE TYPE "FamilyStoryPublishStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'PUBLISHED', 'REJECTED');

ALTER TABLE "FamilyStory" ADD COLUMN "publishStatus" "FamilyStoryPublishStatus" NOT NULL DEFAULT 'DRAFT';
ALTER TABLE "FamilyStory" ADD COLUMN "submittedForReviewAt" TIMESTAMP(3);
ALTER TABLE "FamilyStory" ADD COLUMN "moderationNote" VARCHAR(500);
ALTER TABLE "FamilyStory" ADD COLUMN "moderatedAt" TIMESTAMP(3);
ALTER TABLE "FamilyStory" ADD COLUMN "moderatedById" TEXT;

UPDATE "FamilyStory"
SET "publishStatus" = 'PUBLISHED'
WHERE "publishedAt" IS NOT NULL;

CREATE INDEX "FamilyStory_publishStatus_idx" ON "FamilyStory"("publishStatus");

ALTER TABLE "FamilyStory" ADD CONSTRAINT "FamilyStory_moderatedById_fkey"
  FOREIGN KEY ("moderatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
