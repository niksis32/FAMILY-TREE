-- Messenger moderation: send blocks for abuse prevention

CREATE TYPE "MessengerSanctionType" AS ENUM ('SEND_BLOCKED');

CREATE TABLE "MessengerSanction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "workspaceId" TEXT,
    "type" "MessengerSanctionType" NOT NULL DEFAULT 'SEND_BLOCKED',
    "reason" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MessengerSanction_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MessengerSanction_userId_revokedAt_idx" ON "MessengerSanction"("userId", "revokedAt");
CREATE INDEX "MessengerSanction_workspaceId_idx" ON "MessengerSanction"("workspaceId");
CREATE INDEX "MessengerSanction_expiresAt_idx" ON "MessengerSanction"("expiresAt");

ALTER TABLE "MessengerSanction" ADD CONSTRAINT "MessengerSanction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MessengerSanction" ADD CONSTRAINT "MessengerSanction_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MessengerSanction" ADD CONSTRAINT "MessengerSanction_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
