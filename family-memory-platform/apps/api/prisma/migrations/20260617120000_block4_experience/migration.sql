-- BLOCK 4: Experience & Retention (Onboarding, StoryLocale, QuestLeaderboard opt-in)

CREATE TYPE "StoryLocaleStatus" AS ENUM ('DRAFT', 'TRANSLATING', 'READY', 'FAILED');
CREATE TYPE "StoryTranslationJobStatus" AS ENUM ('QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED');

CREATE TABLE "OnboardingProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "currentStep" TEXT NOT NULL DEFAULT 'welcome',
    "completedSteps" JSONB NOT NULL DEFAULT '[]',
    "skippedSteps" JSONB NOT NULL DEFAULT '[]',
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OnboardingProgress_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StoryLocale" (
    "id" TEXT NOT NULL,
    "storyId" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "sourceLocale" TEXT NOT NULL DEFAULT 'ru',
    "title" TEXT,
    "narrativeText" TEXT,
    "status" "StoryLocaleStatus" NOT NULL DEFAULT 'DRAFT',
    "translatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoryLocale_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StoryTranslationJob" (
    "id" TEXT NOT NULL,
    "storyId" TEXT NOT NULL,
    "storyLocaleId" TEXT,
    "targetLocale" TEXT NOT NULL,
    "status" "StoryTranslationJobStatus" NOT NULL DEFAULT 'QUEUED',
    "error" TEXT,
    "requestedById" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoryTranslationJob_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "QuestLeaderboardOptIn" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "optedIn" BOOLEAN NOT NULL DEFAULT false,
    "displayName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuestLeaderboardOptIn_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OnboardingProgress_userId_workspaceId_key" ON "OnboardingProgress"("userId", "workspaceId");
CREATE INDEX "OnboardingProgress_workspaceId_idx" ON "OnboardingProgress"("workspaceId");

CREATE UNIQUE INDEX "StoryLocale_storyId_locale_key" ON "StoryLocale"("storyId", "locale");
CREATE INDEX "StoryLocale_storyId_idx" ON "StoryLocale"("storyId");

CREATE INDEX "StoryTranslationJob_storyId_status_idx" ON "StoryTranslationJob"("storyId", "status");

CREATE UNIQUE INDEX "QuestLeaderboardOptIn_userId_workspaceId_key" ON "QuestLeaderboardOptIn"("userId", "workspaceId");
CREATE INDEX "QuestLeaderboardOptIn_workspaceId_optedIn_idx" ON "QuestLeaderboardOptIn"("workspaceId", "optedIn");

ALTER TABLE "OnboardingProgress" ADD CONSTRAINT "OnboardingProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OnboardingProgress" ADD CONSTRAINT "OnboardingProgress_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StoryLocale" ADD CONSTRAINT "StoryLocale_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "FamilyStory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StoryTranslationJob" ADD CONSTRAINT "StoryTranslationJob_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "FamilyStory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StoryTranslationJob" ADD CONSTRAINT "StoryTranslationJob_storyLocaleId_fkey" FOREIGN KEY ("storyLocaleId") REFERENCES "StoryLocale"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "StoryTranslationJob" ADD CONSTRAINT "StoryTranslationJob_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "QuestLeaderboardOptIn" ADD CONSTRAINT "QuestLeaderboardOptIn_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "QuestLeaderboardOptIn" ADD CONSTRAINT "QuestLeaderboardOptIn_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
