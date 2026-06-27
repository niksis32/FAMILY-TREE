-- Military history: workspace-scoped custom conflict definitions

CREATE TABLE "MilitaryConflictDefinition" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "color" VARCHAR(7),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MilitaryConflictDefinition_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MilitaryConflictDefinition_workspaceId_name_key" ON "MilitaryConflictDefinition"("workspaceId", "name");
CREATE INDEX "MilitaryConflictDefinition_workspaceId_idx" ON "MilitaryConflictDefinition"("workspaceId");

ALTER TABLE "MilitaryConflictDefinition" ADD CONSTRAINT "MilitaryConflictDefinition_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MilitaryConflictDefinition" ADD CONSTRAINT "MilitaryConflictDefinition_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
