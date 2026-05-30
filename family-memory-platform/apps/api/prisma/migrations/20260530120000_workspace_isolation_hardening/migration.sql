-- PRISMA-HARDENING-1: mandatory workspaceId on Person, Media, Document + composite Relationship index

ALTER TABLE "Person" ADD COLUMN "workspaceId" TEXT;
ALTER TABLE "Media" ADD COLUMN "workspaceId" TEXT;
ALTER TABLE "Document" ADD COLUMN "workspaceId" TEXT;

-- Backfill Person from family membership
UPDATE "Person" p
SET "workspaceId" = sub."workspaceId"
FROM (
  SELECT DISTINCT ON (fm."personId") fm."personId", f."workspaceId"
  FROM "FamilyMember" fm
  INNER JOIN "Family" f ON f."id" = fm."familyId"
  WHERE f."workspaceId" IS NOT NULL AND fm."deletedAt" IS NULL
  ORDER BY fm."personId", fm."createdAt" ASC
) sub
WHERE p."id" = sub."personId" AND p."workspaceId" IS NULL;

-- Ensure a fallback workspace for legacy rows without family workspace
DO $$
DECLARE
  fallback_tenant_id TEXT;
  fallback_workspace_id TEXT;
BEGIN
  SELECT "id" INTO fallback_workspace_id FROM "Workspace" ORDER BY "createdAt" ASC LIMIT 1;

  IF fallback_workspace_id IS NULL THEN
    fallback_tenant_id := 'legacy-tenant-default';
    fallback_workspace_id := 'legacy-workspace-default';

    INSERT INTO "Tenant" ("id", "slug", "name", "createdAt", "updatedAt")
    VALUES (fallback_tenant_id, 'legacy-default', 'Legacy import', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT ("slug") DO NOTHING;

    SELECT "id" INTO fallback_tenant_id FROM "Tenant" WHERE "slug" = 'legacy-default' LIMIT 1;

    INSERT INTO "Workspace" ("id", "tenantId", "name", "isDefault", "createdAt", "updatedAt")
    VALUES (fallback_workspace_id, fallback_tenant_id, 'Default', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT DO NOTHING;

    SELECT "id" INTO fallback_workspace_id FROM "Workspace" ORDER BY "createdAt" ASC LIMIT 1;
  END IF;

  UPDATE "Person" SET "workspaceId" = fallback_workspace_id WHERE "workspaceId" IS NULL;
END $$;

-- Backfill Media from linked person, then fallback workspace
UPDATE "Media" m
SET "workspaceId" = p."workspaceId"
FROM "Person" p
WHERE m."personId" = p."id" AND m."workspaceId" IS NULL;

UPDATE "Media" m
SET "workspaceId" = p."workspaceId"
FROM "Person" p
WHERE m."workspaceId" IS NULL
  AND EXISTS (
    SELECT 1 FROM "MediaLink" ml
    WHERE ml."mediaId" = m."id" AND ml."ownerType" = 'PERSON' AND ml."ownerId" = p."id"
  );

UPDATE "Media"
SET "workspaceId" = (SELECT "id" FROM "Workspace" ORDER BY "createdAt" ASC LIMIT 1)
WHERE "workspaceId" IS NULL;

-- Backfill Document from person or media
UPDATE "Document" d
SET "workspaceId" = p."workspaceId"
FROM "Person" p
WHERE d."personId" = p."id" AND d."workspaceId" IS NULL;

UPDATE "Document" d
SET "workspaceId" = m."workspaceId"
FROM "Media" m
WHERE d."mediaId" = m."id" AND d."workspaceId" IS NULL;

UPDATE "Document"
SET "workspaceId" = (SELECT "id" FROM "Workspace" ORDER BY "createdAt" ASC LIMIT 1)
WHERE "workspaceId" IS NULL;

ALTER TABLE "Person" ALTER COLUMN "workspaceId" SET NOT NULL;
ALTER TABLE "Media" ALTER COLUMN "workspaceId" SET NOT NULL;
ALTER TABLE "Document" ALTER COLUMN "workspaceId" SET NOT NULL;

CREATE INDEX "Person_workspaceId_idx" ON "Person"("workspaceId");
CREATE INDEX "Media_workspaceId_idx" ON "Media"("workspaceId");
CREATE INDEX "Document_workspaceId_idx" ON "Document"("workspaceId");
CREATE INDEX "Relationship_fromPersonId_toPersonId_idx" ON "Relationship"("fromPersonId", "toPersonId");

ALTER TABLE "Person" ADD CONSTRAINT "Person_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Media" ADD CONSTRAINT "Media_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Document" ADD CONSTRAINT "Document_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
