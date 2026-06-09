-- BLOCK 0: Security, Privacy, Ops

CREATE TYPE "MfaMethod" AS ENUM ('TOTP', 'PASSKEY');

CREATE TYPE "WorkspaceExportJobStatus" AS ENUM ('QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED', 'EXPIRED');

CREATE TABLE "UserMfaSettings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "totpEnabled" BOOLEAN NOT NULL DEFAULT false,
    "totpSecretEnc" TEXT,
    "passkeysEnabled" BOOLEAN NOT NULL DEFAULT false,
    "enrolledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserMfaSettings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MfaRecoveryCode" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MfaRecoveryCode_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MfaSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MfaSession_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WebAuthnCredential" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "credentialId" TEXT NOT NULL,
    "publicKey" TEXT NOT NULL,
    "counter" BIGINT NOT NULL DEFAULT 0,
    "deviceName" TEXT,
    "transports" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3),

    CONSTRAINT "WebAuthnCredential_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WorkspaceExportJob" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "status" "WorkspaceExportJobStatus" NOT NULL DEFAULT 'QUEUED',
    "objectKey" TEXT,
    "downloadUrl" TEXT,
    "downloadExpiresAt" TIMESTAMP(3),
    "error" TEXT,
    "manifest" JSONB,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkspaceExportJob_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OpsErrorLog" (
    "id" TEXT NOT NULL,
    "requestId" TEXT,
    "statusCode" INTEGER NOT NULL,
    "method" TEXT,
    "path" TEXT,
    "message" TEXT NOT NULL,
    "stack" TEXT,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OpsErrorLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserMfaSettings_userId_key" ON "UserMfaSettings"("userId");
CREATE INDEX "MfaRecoveryCode_userId_idx" ON "MfaRecoveryCode"("userId");
CREATE UNIQUE INDEX "MfaSession_tokenHash_key" ON "MfaSession"("tokenHash");
CREATE INDEX "MfaSession_userId_idx" ON "MfaSession"("userId");
CREATE INDEX "MfaSession_expiresAt_idx" ON "MfaSession"("expiresAt");
CREATE UNIQUE INDEX "WebAuthnCredential_credentialId_key" ON "WebAuthnCredential"("credentialId");
CREATE INDEX "WebAuthnCredential_userId_idx" ON "WebAuthnCredential"("userId");
CREATE INDEX "WorkspaceExportJob_workspaceId_status_idx" ON "WorkspaceExportJob"("workspaceId", "status");
CREATE INDEX "WorkspaceExportJob_requestedById_idx" ON "WorkspaceExportJob"("requestedById");
CREATE INDEX "OpsErrorLog_requestId_idx" ON "OpsErrorLog"("requestId");
CREATE INDEX "OpsErrorLog_createdAt_idx" ON "OpsErrorLog"("createdAt");
CREATE INDEX "OpsErrorLog_statusCode_idx" ON "OpsErrorLog"("statusCode");

ALTER TABLE "UserMfaSettings" ADD CONSTRAINT "UserMfaSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MfaRecoveryCode" ADD CONSTRAINT "MfaRecoveryCode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WebAuthnCredential" ADD CONSTRAINT "WebAuthnCredential_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkspaceExportJob" ADD CONSTRAINT "WorkspaceExportJob_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkspaceExportJob" ADD CONSTRAINT "WorkspaceExportJob_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
