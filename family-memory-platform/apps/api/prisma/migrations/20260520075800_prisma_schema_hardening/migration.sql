-- Prisma schema hardening for MVP release:
-- enums, soft delete fields, media links, seed-ready indexes.

-- UserRole: replace MEMBER with VIEWER while preserving existing ADMIN/EDITOR values.
ALTER TYPE "UserRole" RENAME TO "UserRole_old";
CREATE TYPE "UserRole" AS ENUM ('VIEWER', 'EDITOR', 'ADMIN');
ALTER TABLE "User" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "User"
  ALTER COLUMN "role" TYPE "UserRole"
  USING (
    CASE
      WHEN "role"::text = 'MEMBER' THEN 'VIEWER'
      ELSE "role"::text
    END
  )::"UserRole";
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'VIEWER';
DROP TYPE "UserRole_old";

-- New domain enums.
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER', 'UNKNOWN');
CREATE TYPE "RelationshipType" AS ENUM ('PARENT', 'CHILD', 'SPOUSE', 'SIBLING', 'PARTNER', 'ADOPTIVE_PARENT', 'ADOPTIVE_CHILD', 'UNKNOWN');
CREATE TYPE "EventType" AS ENUM ('BIRTH', 'DEATH', 'MARRIAGE', 'DIVORCE', 'BURIAL', 'RESIDENCE', 'MIGRATION', 'EDUCATION', 'MILITARY', 'WORK', 'OCCUPATION', 'IMMIGRATION', 'CUSTOM');
CREATE TYPE "PrivacyLevel" AS ENUM ('PUBLIC', 'FAMILY', 'PRIVATE');
CREATE TYPE "MediaOwnerType" AS ENUM ('PERSON', 'FAMILY', 'EVENT', 'DOCUMENT', 'SOURCE');
CREATE TYPE "StorageProvider" AS ENUM ('MINIO');
CREATE TYPE "DocumentType" AS ENUM ('BIRTH_CERTIFICATE', 'DEATH_CERTIFICATE', 'MARRIAGE_CERTIFICATE', 'PHOTO', 'ARCHIVE_RECORD', 'PASSPORT', 'MILITARY_RECORD', 'OTHER');

-- Soft delete and privacy.
ALTER TABLE "User" ADD COLUMN "deletedAt" TIMESTAMP(3);

ALTER TABLE "Person" ADD COLUMN "privacyLevel" "PrivacyLevel" NOT NULL DEFAULT 'FAMILY';
ALTER TABLE "Person" ADD COLUMN "deletedAt" TIMESTAMP(3);
ALTER TABLE "Person"
  ALTER COLUMN "gender" TYPE "Gender"
  USING (
    CASE lower(coalesce("gender", 'unknown'))
      WHEN 'male' THEN 'MALE'
      WHEN 'm' THEN 'MALE'
      WHEN 'female' THEN 'FEMALE'
      WHEN 'f' THEN 'FEMALE'
      WHEN 'other' THEN 'OTHER'
      ELSE 'UNKNOWN'
    END
  )::"Gender";
ALTER TABLE "Person" ALTER COLUMN "gender" SET DEFAULT 'UNKNOWN';

ALTER TABLE "Family" ADD COLUMN "deletedAt" TIMESTAMP(3);

ALTER TABLE "FamilyMember" ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "FamilyMember" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "FamilyMember" ADD COLUMN "deletedAt" TIMESTAMP(3);

-- Typed relationships.
ALTER TABLE "Relationship" ADD COLUMN "confidence" DOUBLE PRECISION DEFAULT 1.0;
ALTER TABLE "Relationship" ADD COLUMN "sourceId" TEXT;
ALTER TABLE "Relationship" ADD COLUMN "deletedAt" TIMESTAMP(3);
ALTER TABLE "Relationship"
  ALTER COLUMN "type" TYPE "RelationshipType"
  USING (
    CASE lower("type")
      WHEN 'parent' THEN 'PARENT'
      WHEN 'child' THEN 'CHILD'
      WHEN 'spouse' THEN 'SPOUSE'
      WHEN 'sibling' THEN 'SIBLING'
      WHEN 'partner' THEN 'PARTNER'
      WHEN 'adoptive_parent' THEN 'ADOPTIVE_PARENT'
      WHEN 'adoptive_child' THEN 'ADOPTIVE_CHILD'
      ELSE 'UNKNOWN'
    END
  )::"RelationshipType";
ALTER TABLE "Relationship" ALTER COLUMN "type" SET DEFAULT 'PARENT';

-- Typed events.
ALTER TABLE "Event" ADD COLUMN "deletedAt" TIMESTAMP(3);
ALTER TABLE "Event"
  ALTER COLUMN "type" TYPE "EventType"
  USING (
    CASE lower("type")
      WHEN 'birth' THEN 'BIRTH'
      WHEN 'death' THEN 'DEATH'
      WHEN 'marriage' THEN 'MARRIAGE'
      WHEN 'divorce' THEN 'DIVORCE'
      WHEN 'burial' THEN 'BURIAL'
      WHEN 'residence' THEN 'RESIDENCE'
      WHEN 'migration' THEN 'MIGRATION'
      WHEN 'education' THEN 'EDUCATION'
      WHEN 'military' THEN 'MILITARY'
      WHEN 'work' THEN 'WORK'
      WHEN 'occupation' THEN 'OCCUPATION'
      WHEN 'immigration' THEN 'IMMIGRATION'
      ELSE 'CUSTOM'
    END
  )::"EventType";
ALTER TABLE "Event" ALTER COLUMN "type" SET DEFAULT 'CUSTOM';

ALTER TABLE "Place" ADD COLUMN "deletedAt" TIMESTAMP(3);

-- Media/document hardening.
ALTER TABLE "Media" ADD COLUMN "storageProvider" "StorageProvider" NOT NULL DEFAULT 'MINIO';
ALTER TABLE "Media" ADD COLUMN "deletedAt" TIMESTAMP(3);

CREATE TABLE "MediaLink" (
    "id" TEXT NOT NULL,
    "mediaId" TEXT NOT NULL,
    "ownerType" "MediaOwnerType" NOT NULL,
    "ownerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MediaLink_pkey" PRIMARY KEY ("id")
);

INSERT INTO "MediaLink" ("id", "mediaId", "ownerType", "ownerId")
SELECT 'migrated_' || "id", "id", 'PERSON', "personId"
FROM "Media"
WHERE "personId" IS NOT NULL;

ALTER TABLE "Document" ADD COLUMN "mediaId" TEXT;
ALTER TABLE "Document" ADD COLUMN "sourceId" TEXT;
ALTER TABLE "Document" ADD COLUMN "documentType" "DocumentType" NOT NULL DEFAULT 'OTHER';
ALTER TABLE "Document" ADD COLUMN "ocrText" TEXT;
ALTER TABLE "Document" ADD COLUMN "deletedAt" TIMESTAMP(3);

ALTER TABLE "Source" ADD COLUMN "deletedAt" TIMESTAMP(3);
ALTER TABLE "Citation" ADD COLUMN "deletedAt" TIMESTAMP(3);
ALTER TABLE "TimelineItem" ADD COLUMN "deletedAt" TIMESTAMP(3);

-- Indexes for frequent MVP queries.
CREATE INDEX "User_role_idx" ON "User"("role");
CREATE INDEX "User_deletedAt_idx" ON "User"("deletedAt");

CREATE INDEX "Person_familyName_givenName_idx" ON "Person"("familyName", "givenName");
CREATE INDEX "Person_birthDate_idx" ON "Person"("birthDate");
CREATE INDEX "Person_deathDate_idx" ON "Person"("deathDate");
CREATE INDEX "Person_isLiving_idx" ON "Person"("isLiving");
CREATE INDEX "Person_privacyLevel_idx" ON "Person"("privacyLevel");
CREATE INDEX "Person_deletedAt_idx" ON "Person"("deletedAt");

CREATE INDEX "Family_name_idx" ON "Family"("name");
CREATE INDEX "Family_deletedAt_idx" ON "Family"("deletedAt");
CREATE INDEX "FamilyMember_personId_role_idx" ON "FamilyMember"("personId", "role");
CREATE INDEX "FamilyMember_deletedAt_idx" ON "FamilyMember"("deletedAt");

CREATE INDEX "Relationship_type_idx" ON "Relationship"("type");
CREATE INDEX "Relationship_sourceId_idx" ON "Relationship"("sourceId");
CREATE INDEX "Relationship_deletedAt_idx" ON "Relationship"("deletedAt");

CREATE INDEX "Event_personId_date_idx" ON "Event"("personId", "date");
CREATE INDEX "Event_familyId_date_idx" ON "Event"("familyId", "date");
CREATE INDEX "Event_placeId_idx" ON "Event"("placeId");
CREATE INDEX "Event_type_idx" ON "Event"("type");
CREATE INDEX "Event_deletedAt_idx" ON "Event"("deletedAt");

CREATE INDEX "Place_country_region_city_idx" ON "Place"("country", "region", "city");
CREATE INDEX "Place_name_idx" ON "Place"("name");
CREATE INDEX "Place_deletedAt_idx" ON "Place"("deletedAt");

CREATE UNIQUE INDEX "Media_bucket_storageKey_key" ON "Media"("bucket", "storageKey");
CREATE INDEX "Media_personId_idx" ON "Media"("personId");
CREATE INDEX "Media_mimeType_idx" ON "Media"("mimeType");
CREATE INDEX "Media_takenAt_idx" ON "Media"("takenAt");
CREATE INDEX "Media_deletedAt_idx" ON "Media"("deletedAt");

CREATE UNIQUE INDEX "MediaLink_mediaId_ownerType_ownerId_key" ON "MediaLink"("mediaId", "ownerType", "ownerId");
CREATE INDEX "MediaLink_ownerType_ownerId_idx" ON "MediaLink"("ownerType", "ownerId");
CREATE INDEX "MediaLink_mediaId_idx" ON "MediaLink"("mediaId");

CREATE INDEX "Document_personId_idx" ON "Document"("personId");
CREATE INDEX "Document_mediaId_idx" ON "Document"("mediaId");
CREATE INDEX "Document_sourceId_idx" ON "Document"("sourceId");
CREATE INDEX "Document_documentType_idx" ON "Document"("documentType");
CREATE INDEX "Document_deletedAt_idx" ON "Document"("deletedAt");

CREATE INDEX "Source_title_idx" ON "Source"("title");
CREATE INDEX "Source_deletedAt_idx" ON "Source"("deletedAt");

CREATE INDEX "Citation_sourceId_idx" ON "Citation"("sourceId");
CREATE INDEX "Citation_personId_idx" ON "Citation"("personId");
CREATE INDEX "Citation_deletedAt_idx" ON "Citation"("deletedAt");

CREATE INDEX "TimelineItem_eventId_idx" ON "TimelineItem"("eventId");
CREATE INDEX "TimelineItem_deletedAt_idx" ON "TimelineItem"("deletedAt");

-- Foreign keys for new relations.
ALTER TABLE "Relationship" ADD CONSTRAINT "Relationship_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MediaLink" ADD CONSTRAINT "MediaLink_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "Media"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Document" ADD CONSTRAINT "Document_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "Media"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Document" ADD CONSTRAINT "Document_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source"("id") ON DELETE SET NULL ON UPDATE CASCADE;
