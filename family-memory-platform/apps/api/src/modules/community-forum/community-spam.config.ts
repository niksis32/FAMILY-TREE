import {
  COMMUNITY_POST_COOLDOWN_SEC_DEFAULT,
  COMMUNITY_POST_DUPLICATE_WINDOW_SEC_DEFAULT,
  COMMUNITY_POST_MAX_PER_DAY_DEFAULT,
  COMMUNITY_POST_MAX_PER_GROUP_HOUR_DEFAULT,
  COMMUNITY_POST_MAX_PER_HOUR_DEFAULT,
  COMMUNITY_POST_MAX_URLS_DEFAULT,
  COMMUNITY_SPAM_HTTP_POST_LIMIT_DEFAULT,
  COMMUNITY_SPAM_HTTP_THREAD_LIMIT_DEFAULT,
  COMMUNITY_THREAD_COOLDOWN_SEC_DEFAULT,
  COMMUNITY_THREAD_MAX_PER_HOUR_DEFAULT,
} from '@family/shared';

export interface CommunitySpamConfig {
  postCooldownSec: number;
  postMaxPerHour: number;
  postMaxPerGroupHour: number;
  postMaxPerDay: number;
  postDuplicateWindowSec: number;
  postMaxUrls: number;
  threadCooldownSec: number;
  threadMaxPerHour: number;
  httpPostLimitPerMinute: number;
  httpThreadLimitPerMinute: number;
}

function parsePositiveInt(value: string | undefined, fallback: number): number {
  const n = Number.parseInt(value ?? '', 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export function loadCommunitySpamConfig(): CommunitySpamConfig {
  return {
    postCooldownSec: parsePositiveInt(
      process.env.COMMUNITY_POST_COOLDOWN_SEC,
      COMMUNITY_POST_COOLDOWN_SEC_DEFAULT,
    ),
    postMaxPerHour: parsePositiveInt(
      process.env.COMMUNITY_POST_MAX_PER_HOUR,
      COMMUNITY_POST_MAX_PER_HOUR_DEFAULT,
    ),
    postMaxPerGroupHour: parsePositiveInt(
      process.env.COMMUNITY_POST_MAX_PER_GROUP_HOUR,
      COMMUNITY_POST_MAX_PER_GROUP_HOUR_DEFAULT,
    ),
    postMaxPerDay: parsePositiveInt(
      process.env.COMMUNITY_POST_MAX_PER_DAY,
      COMMUNITY_POST_MAX_PER_DAY_DEFAULT,
    ),
    postDuplicateWindowSec: parsePositiveInt(
      process.env.COMMUNITY_POST_DUPLICATE_WINDOW_SEC,
      COMMUNITY_POST_DUPLICATE_WINDOW_SEC_DEFAULT,
    ),
    postMaxUrls: parsePositiveInt(
      process.env.COMMUNITY_POST_MAX_URLS,
      COMMUNITY_POST_MAX_URLS_DEFAULT,
    ),
    threadCooldownSec: parsePositiveInt(
      process.env.COMMUNITY_THREAD_COOLDOWN_SEC,
      COMMUNITY_THREAD_COOLDOWN_SEC_DEFAULT,
    ),
    threadMaxPerHour: parsePositiveInt(
      process.env.COMMUNITY_THREAD_MAX_PER_HOUR,
      COMMUNITY_THREAD_MAX_PER_HOUR_DEFAULT,
    ),
    httpPostLimitPerMinute: parsePositiveInt(
      process.env.COMMUNITY_SPAM_HTTP_POST_LIMIT,
      COMMUNITY_SPAM_HTTP_POST_LIMIT_DEFAULT,
    ),
    httpThreadLimitPerMinute: parsePositiveInt(
      process.env.COMMUNITY_SPAM_HTTP_THREAD_LIMIT,
      COMMUNITY_SPAM_HTTP_THREAD_LIMIT_DEFAULT,
    ),
  };
}
