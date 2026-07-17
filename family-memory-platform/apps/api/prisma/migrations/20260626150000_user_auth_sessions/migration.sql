-- User auth sessions registry and login audit log

CREATE TYPE "LoginEventOutcome" AS ENUM (
  'SUCCESS',
  'MFA_CHALLENGE',
  'FAILURE_BAD_CREDENTIALS',
  'FAILURE_INACTIVE',
  'FAILURE_MFA'
);

CREATE TABLE "UserAuthSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "jti" TEXT NOT NULL,
    "deviceLabel" TEXT,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "revokedById" TEXT,
    "revokeReason" TEXT,

    CONSTRAINT "UserAuthSession_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UserLoginEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "emailAttempt" TEXT,
    "outcome" "LoginEventOutcome" NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "deviceLabel" TEXT,
    "isSuspicious" BOOLEAN NOT NULL DEFAULT false,
    "suspiciousReason" TEXT,
    "sessionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserLoginEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserAuthSession_jti_key" ON "UserAuthSession"("jti");
CREATE INDEX "UserAuthSession_userId_revokedAt_idx" ON "UserAuthSession"("userId", "revokedAt");
CREATE INDEX "UserAuthSession_expiresAt_idx" ON "UserAuthSession"("expiresAt");
CREATE INDEX "UserAuthSession_lastSeenAt_idx" ON "UserAuthSession"("lastSeenAt");

CREATE UNIQUE INDEX "UserLoginEvent_sessionId_key" ON "UserLoginEvent"("sessionId");
CREATE INDEX "UserLoginEvent_userId_createdAt_idx" ON "UserLoginEvent"("userId", "createdAt");
CREATE INDEX "UserLoginEvent_isSuspicious_createdAt_idx" ON "UserLoginEvent"("isSuspicious", "createdAt");
CREATE INDEX "UserLoginEvent_ipAddress_createdAt_idx" ON "UserLoginEvent"("ipAddress", "createdAt");
CREATE INDEX "UserLoginEvent_createdAt_idx" ON "UserLoginEvent"("createdAt");

ALTER TABLE "UserAuthSession" ADD CONSTRAINT "UserAuthSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserAuthSession" ADD CONSTRAINT "UserAuthSession_revokedById_fkey" FOREIGN KEY ("revokedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "UserLoginEvent" ADD CONSTRAINT "UserLoginEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "UserLoginEvent" ADD CONSTRAINT "UserLoginEvent_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "UserAuthSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;
