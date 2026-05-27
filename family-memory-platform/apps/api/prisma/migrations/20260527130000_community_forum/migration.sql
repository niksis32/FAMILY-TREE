-- CreateEnum
CREATE TYPE "CommunityGroupType" AS ENUM ('SURNAME', 'REGION', 'COUNTRY', 'PERIOD', 'TOPIC');
CREATE TYPE "CommunityGroupVisibility" AS ENUM ('PUBLIC', 'PRIVATE', 'INVITE_ONLY');
CREATE TYPE "ForumThreadStatus" AS ENUM ('OPEN', 'LOCKED', 'ARCHIVED');
CREATE TYPE "ForumContentStatus" AS ENUM ('PENDING_REVIEW', 'PUBLISHED', 'HIDDEN', 'FLAGGED', 'DELETED');
CREATE TYPE "ResearchRequestStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');
CREATE TYPE "ModerationReportCategory" AS ENUM ('SPAM', 'HARASSMENT', 'PERSONAL_DATA_LIVING', 'MISINFORMATION', 'OFF_TOPIC', 'COPYRIGHT', 'OTHER');
CREATE TYPE "ModerationReportStatus" AS ENUM ('OPEN', 'UNDER_REVIEW', 'RESOLVED', 'DISMISSED');
CREATE TYPE "ModerationActionType" AS ENUM ('WARN', 'HIDE_CONTENT', 'SOFT_DELETE', 'RESTORE', 'BAN_USER_TEMP', 'BAN_USER_PERM');
CREATE TYPE "CommunityReputationEventType" AS ENUM ('HELPFUL_POST', 'THREAD_START', 'REPLY', 'EXPERT_ANSWER_ACCEPTED', 'MODERATION_PENALTY', 'REPORT_UPHELD_AGAINST');

-- CreateTable
CREATE TABLE "CommunityGroup" (
    "id" TEXT NOT NULL,
    "type" "CommunityGroupType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "visibility" "CommunityGroupVisibility" NOT NULL DEFAULT 'PUBLIC',
    "ownerId" TEXT NOT NULL,
    "slug" TEXT,
    "regionLabel" TEXT,
    "countryCode" TEXT,
    "periodFrom" INTEGER,
    "periodTo" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "CommunityGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ForumThread" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "ForumThreadStatus" NOT NULL DEFAULT 'OPEN',
    "documentId" TEXT,
    "contentStatus" "ForumContentStatus" NOT NULL DEFAULT 'PUBLISHED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ForumThread_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ForumPost" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "attachments" JSONB,
    "referencesLivingPersonData" BOOLEAN NOT NULL DEFAULT false,
    "hasConsentForPublicLivingData" BOOLEAN NOT NULL DEFAULT false,
    "contentStatus" "ForumContentStatus" NOT NULL DEFAULT 'PUBLISHED',
    "isExpertAnswer" BOOLEAN NOT NULL DEFAULT false,
    "helpfulCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ForumPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ForumPostHelpfulVote" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "voterId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ForumPostHelpfulVote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResearchRequest" (
    "id" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "surname" TEXT,
    "region" TEXT,
    "period" TEXT,
    "description" TEXT NOT NULL,
    "status" "ResearchRequestStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ResearchRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResearcherPublicProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bio" TEXT,
    "specialties" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "locale" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResearcherPublicProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityReputationEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "type" "CommunityReputationEventType" NOT NULL,
    "baseWeight" DOUBLE PRECISION NOT NULL,
    "decayMultiplier" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "note" TEXT,
    "relatedPostId" TEXT,
    "relatedThreadId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommunityReputationEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityUserStrike" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "strikeCount" INTEGER NOT NULL DEFAULT 0,
    "lastStrikeAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommunityUserStrike_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModerationReport" (
    "id" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "category" "ModerationReportCategory" NOT NULL,
    "details" TEXT,
    "status" "ModerationReportStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ModerationReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModerationAction" (
    "id" TEXT NOT NULL,
    "moderatorId" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "actionType" "ModerationActionType" NOT NULL,
    "reason" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ModerationAction_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "CommunityGroup" ADD CONSTRAINT "CommunityGroup_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ForumThread" ADD CONSTRAINT "ForumThread_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "CommunityGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ForumThread" ADD CONSTRAINT "ForumThread_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ForumThread" ADD CONSTRAINT "ForumThread_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ForumPost" ADD CONSTRAINT "ForumPost_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "ForumThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ForumPost" ADD CONSTRAINT "ForumPost_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ForumPostHelpfulVote" ADD CONSTRAINT "ForumPostHelpfulVote_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "ForumThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ForumPostHelpfulVote" ADD CONSTRAINT "ForumPostHelpfulVote_postId_fkey" FOREIGN KEY ("postId") REFERENCES "ForumPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ForumPostHelpfulVote" ADD CONSTRAINT "ForumPostHelpfulVote_voterId_fkey" FOREIGN KEY ("voterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ResearchRequest" ADD CONSTRAINT "ResearchRequest_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ResearcherPublicProfile" ADD CONSTRAINT "ResearcherPublicProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CommunityReputationEvent" ADD CONSTRAINT "CommunityReputationEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommunityReputationEvent" ADD CONSTRAINT "CommunityReputationEvent_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "CommunityGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CommunityUserStrike" ADD CONSTRAINT "CommunityUserStrike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ModerationReport" ADD CONSTRAINT "ModerationReport_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ModerationAction" ADD CONSTRAINT "ModerationAction_moderatorId_fkey" FOREIGN KEY ("moderatorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "CommunityGroup_type_idx" ON "CommunityGroup"("type");
CREATE INDEX "CommunityGroup_ownerId_idx" ON "CommunityGroup"("ownerId");
CREATE INDEX "CommunityGroup_slug_idx" ON "CommunityGroup"("slug");
CREATE INDEX "CommunityGroup_deletedAt_idx" ON "CommunityGroup"("deletedAt");

CREATE INDEX "ForumThread_groupId_idx" ON "ForumThread"("groupId");
CREATE INDEX "ForumThread_authorId_idx" ON "ForumThread"("authorId");
CREATE INDEX "ForumThread_documentId_idx" ON "ForumThread"("documentId");
CREATE INDEX "ForumThread_contentStatus_idx" ON "ForumThread"("contentStatus");
CREATE INDEX "ForumThread_deletedAt_idx" ON "ForumThread"("deletedAt");

CREATE INDEX "ForumPost_threadId_idx" ON "ForumPost"("threadId");
CREATE INDEX "ForumPost_authorId_idx" ON "ForumPost"("authorId");
CREATE INDEX "ForumPost_contentStatus_idx" ON "ForumPost"("contentStatus");
CREATE INDEX "ForumPost_deletedAt_idx" ON "ForumPost"("deletedAt");

CREATE UNIQUE INDEX "ForumPostHelpfulVote_postId_voterId_key" ON "ForumPostHelpfulVote"("postId", "voterId");
CREATE INDEX "ForumPostHelpfulVote_threadId_idx" ON "ForumPostHelpfulVote"("threadId");
CREATE INDEX "ForumPostHelpfulVote_voterId_idx" ON "ForumPostHelpfulVote"("voterId");

CREATE INDEX "ResearchRequest_authorId_idx" ON "ResearchRequest"("authorId");
CREATE INDEX "ResearchRequest_status_idx" ON "ResearchRequest"("status");
CREATE INDEX "ResearchRequest_surname_idx" ON "ResearchRequest"("surname");
CREATE INDEX "ResearchRequest_deletedAt_idx" ON "ResearchRequest"("deletedAt");

CREATE UNIQUE INDEX "ResearcherPublicProfile_userId_key" ON "ResearcherPublicProfile"("userId");

CREATE INDEX "CommunityReputationEvent_userId_groupId_idx" ON "CommunityReputationEvent"("userId", "groupId");
CREATE INDEX "CommunityReputationEvent_groupId_createdAt_idx" ON "CommunityReputationEvent"("groupId", "createdAt");
CREATE INDEX "CommunityReputationEvent_type_idx" ON "CommunityReputationEvent"("type");

CREATE UNIQUE INDEX "CommunityUserStrike_userId_key" ON "CommunityUserStrike"("userId");

CREATE INDEX "ModerationReport_targetType_targetId_idx" ON "ModerationReport"("targetType", "targetId");
CREATE INDEX "ModerationReport_status_idx" ON "ModerationReport"("status");
CREATE INDEX "ModerationReport_reporterId_idx" ON "ModerationReport"("reporterId");

CREATE INDEX "ModerationAction_targetType_targetId_idx" ON "ModerationAction"("targetType", "targetId");
CREATE INDEX "ModerationAction_moderatorId_idx" ON "ModerationAction"("moderatorId");
CREATE INDEX "ModerationAction_createdAt_idx" ON "ModerationAction"("createdAt");
