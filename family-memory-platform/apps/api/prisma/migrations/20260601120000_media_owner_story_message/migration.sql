-- Link media to family stories and forum messages (PROMPT PROD 2)
ALTER TYPE "MediaOwnerType" ADD VALUE IF NOT EXISTS 'STORY';
ALTER TYPE "MediaOwnerType" ADD VALUE IF NOT EXISTS 'MESSAGE';
