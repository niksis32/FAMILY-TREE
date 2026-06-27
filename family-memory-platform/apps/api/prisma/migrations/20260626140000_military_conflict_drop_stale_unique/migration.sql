-- Fix drift: initial migration created a UNIQUE INDEX (not a named CONSTRAINT).
-- migrate dev was prompting for a new migration because the index still existed.

DROP INDEX IF EXISTS "MilitaryConflictDefinition_workspaceId_name_key";
