-- BLOCK 5: Webhooks API

CREATE TYPE "WebhookEventType" AS ENUM (
  'PERSON_CREATED',
  'MEDIA_UPLOADED',
  'STORY_PUBLISHED',
  'MATCH_FOUND',
  'MESSAGE_CREATED',
  'PING'
);

CREATE TYPE "WebhookEventStatus" AS ENUM (
  'PENDING',
  'DELIVERING',
  'DELIVERED',
  'FAILED',
  'DEAD_LETTER',
  'CANCELLED'
);

CREATE TYPE "WebhookEndpointStatus" AS ENUM ('ACTIVE', 'DISABLED');

CREATE TABLE "WebhookEndpoint" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "description" TEXT,
  "secretHash" TEXT NOT NULL,
  "secretPrefix" TEXT NOT NULL,
  "secretEnc" TEXT NOT NULL,
  "subscribedEvents" "WebhookEventType"[],
  "status" "WebhookEndpointStatus" NOT NULL DEFAULT 'ACTIVE',
  "createdById" TEXT NOT NULL,
  "disabledAt" TIMESTAMP(3),
  "lastSuccessAt" TIMESTAMP(3),
  "consecutiveFailures" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "WebhookEndpoint_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WebhookEvent" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "endpointId" TEXT NOT NULL,
  "eventType" "WebhookEventType" NOT NULL,
  "status" "WebhookEventStatus" NOT NULL DEFAULT 'PENDING',
  "payload" JSONB NOT NULL,
  "entityType" TEXT,
  "entityId" TEXT,
  "attemptCount" INTEGER NOT NULL DEFAULT 0,
  "nextRetryAt" TIMESTAMP(3),
  "deliveredAt" TIMESTAMP(3),
  "lastError" TEXT,
  "idempotencyKey" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "WebhookEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WebhookDeliveryAttempt" (
  "id" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "attemptNumber" INTEGER NOT NULL,
  "httpStatus" INTEGER,
  "responseBodySnippet" TEXT,
  "durationMs" INTEGER,
  "errorMessage" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "WebhookDeliveryAttempt_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "WebhookEndpoint_workspaceId_status_idx" ON "WebhookEndpoint"("workspaceId", "status");
CREATE INDEX "WebhookEvent_endpointId_createdAt_idx" ON "WebhookEvent"("endpointId", "createdAt");
CREATE INDEX "WebhookEvent_workspaceId_status_nextRetryAt_idx" ON "WebhookEvent"("workspaceId", "status", "nextRetryAt");
CREATE INDEX "WebhookDeliveryAttempt_eventId_attemptNumber_idx" ON "WebhookDeliveryAttempt"("eventId", "attemptNumber");

ALTER TABLE "WebhookEndpoint"
  ADD CONSTRAINT "WebhookEndpoint_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WebhookEndpoint"
  ADD CONSTRAINT "WebhookEndpoint_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WebhookEvent"
  ADD CONSTRAINT "WebhookEvent_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WebhookEvent"
  ADD CONSTRAINT "WebhookEvent_endpointId_fkey"
  FOREIGN KEY ("endpointId") REFERENCES "WebhookEndpoint"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WebhookDeliveryAttempt"
  ADD CONSTRAINT "WebhookDeliveryAttempt_eventId_fkey"
  FOREIGN KEY ("eventId") REFERENCES "WebhookEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
