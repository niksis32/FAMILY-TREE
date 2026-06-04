-- PROMPT 9 / legacy tables: mandatory workspaceId + row-level isolation via Prisma extension

ALTER TABLE "Family" ALTER COLUMN "workspaceId" DROP NOT NULL;
ALTER TABLE "FamilyMember" ADD COLUMN "workspaceId" TEXT;
ALTER TABLE "Relationship" ADD COLUMN "workspaceId" TEXT;
ALTER TABLE "Event" ADD COLUMN "workspaceId" TEXT;
ALTER TABLE "Source" ADD COLUMN "workspaceId" TEXT;
ALTER TABLE "Citation" ADD COLUMN "workspaceId" TEXT;
ALTER TABLE "TimelineItem" ADD COLUMN "workspaceId" TEXT;

-- Family: backfill NULL workspaceId from members or fallback workspace
UPDATE "Family" f
SET "workspaceId" = sub."workspaceId"
FROM (
  SELECT DISTINCT ON (fm."familyId") fm."familyId", p."workspaceId"
  FROM "FamilyMember" fm
  INNER JOIN "Person" p ON p."id" = fm."personId"
  WHERE fm."deletedAt" IS NULL
  ORDER BY fm."familyId", fm."createdAt" ASC
) sub
WHERE f."id" = sub."familyId" AND f."workspaceId" IS NULL;

UPDATE "Family"
SET "workspaceId" = (SELECT "id" FROM "Workspace" ORDER BY "createdAt" ASC LIMIT 1)
WHERE "workspaceId" IS NULL;

-- FamilyMember
UPDATE "FamilyMember" fm
SET "workspaceId" = f."workspaceId"
FROM "Family" f
WHERE fm."familyId" = f."id" AND fm."workspaceId" IS NULL;

UPDATE "FamilyMember" fm
SET "workspaceId" = p."workspaceId"
FROM "Person" p
WHERE fm."personId" = p."id" AND fm."workspaceId" IS NULL;

-- Relationship from fromPerson
UPDATE "Relationship" r
SET "workspaceId" = p."workspaceId"
FROM "Person" p
WHERE r."fromPersonId" = p."id" AND r."workspaceId" IS NULL;

-- Event from person, then family
UPDATE "Event" e
SET "workspaceId" = p."workspaceId"
FROM "Person" p
WHERE e."personId" = p."id" AND e."workspaceId" IS NULL;

UPDATE "Event" e
SET "workspaceId" = f."workspaceId"
FROM "Family" f
WHERE e."familyId" = f."id" AND e."workspaceId" IS NULL;

-- Source from linked documents, relationships, citations; then fallback
UPDATE "Source" s
SET "workspaceId" = d."workspaceId"
FROM "Document" d
WHERE d."sourceId" = s."id" AND s."workspaceId" IS NULL;

UPDATE "Source" s
SET "workspaceId" = r."workspaceId"
FROM "Relationship" r
WHERE r."sourceId" = s."id" AND s."workspaceId" IS NULL;

UPDATE "Source" s
SET "workspaceId" = c."workspaceId"
FROM "Citation" c
WHERE c."sourceId" = s."id" AND s."workspaceId" IS NULL;

UPDATE "Source"
SET "workspaceId" = (SELECT "id" FROM "Workspace" ORDER BY "createdAt" ASC LIMIT 1)
WHERE "workspaceId" IS NULL;

-- Citation from person or source
UPDATE "Citation" c
SET "workspaceId" = p."workspaceId"
FROM "Person" p
WHERE c."personId" = p."id" AND c."workspaceId" IS NULL;

UPDATE "Citation" c
SET "workspaceId" = s."workspaceId"
FROM "Source" s
WHERE c."sourceId" = s."id" AND c."workspaceId" IS NULL;

-- TimelineItem from person
UPDATE "TimelineItem" ti
SET "workspaceId" = p."workspaceId"
FROM "Person" p
WHERE ti."personId" = p."id" AND ti."workspaceId" IS NULL;

-- Final fallback for any remaining NULLs
DO $$
DECLARE
  fallback_workspace_id TEXT;
BEGIN
  SELECT "id" INTO fallback_workspace_id FROM "Workspace" ORDER BY "createdAt" ASC LIMIT 1;

  IF fallback_workspace_id IS NULL THEN
    RAISE EXCEPTION 'legacy_workspace_isolation: no Workspace row for backfill';
  END IF;

  UPDATE "FamilyMember" SET "workspaceId" = fallback_workspace_id WHERE "workspaceId" IS NULL;
  UPDATE "Relationship" SET "workspaceId" = fallback_workspace_id WHERE "workspaceId" IS NULL;
  UPDATE "Event" SET "workspaceId" = fallback_workspace_id WHERE "workspaceId" IS NULL;
  UPDATE "Citation" SET "workspaceId" = fallback_workspace_id WHERE "workspaceId" IS NULL;
  UPDATE "TimelineItem" SET "workspaceId" = fallback_workspace_id WHERE "workspaceId" IS NULL;
END $$;

ALTER TABLE "Family" ALTER COLUMN "workspaceId" SET NOT NULL;
ALTER TABLE "FamilyMember" ALTER COLUMN "workspaceId" SET NOT NULL;
ALTER TABLE "Relationship" ALTER COLUMN "workspaceId" SET NOT NULL;
ALTER TABLE "Event" ALTER COLUMN "workspaceId" SET NOT NULL;
ALTER TABLE "Source" ALTER COLUMN "workspaceId" SET NOT NULL;
ALTER TABLE "Citation" ALTER COLUMN "workspaceId" SET NOT NULL;
ALTER TABLE "TimelineItem" ALTER COLUMN "workspaceId" SET NOT NULL;

CREATE INDEX "FamilyMember_workspaceId_idx" ON "FamilyMember"("workspaceId");
CREATE INDEX "Relationship_workspaceId_idx" ON "Relationship"("workspaceId");
CREATE INDEX "Event_workspaceId_idx" ON "Event"("workspaceId");
CREATE INDEX "Source_workspaceId_idx" ON "Source"("workspaceId");
CREATE INDEX "Citation_workspaceId_idx" ON "Citation"("workspaceId");
CREATE INDEX "TimelineItem_workspaceId_idx" ON "TimelineItem"("workspaceId");

ALTER TABLE "Family" DROP CONSTRAINT IF EXISTS "Family_workspaceId_fkey";
ALTER TABLE "Family" ADD CONSTRAINT "Family_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "FamilyMember" ADD CONSTRAINT "FamilyMember_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Relationship" ADD CONSTRAINT "Relationship_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Event" ADD CONSTRAINT "Event_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Source" ADD CONSTRAINT "Source_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Citation" ADD CONSTRAINT "Citation_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TimelineItem" ADD CONSTRAINT "TimelineItem_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
