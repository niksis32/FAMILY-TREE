/** PROMPT 8 — Community forum anti-spam / rate-limit defaults. */

/** Min seconds between posts by the same user in one group. */
export const COMMUNITY_POST_COOLDOWN_SEC_DEFAULT = 30;

/** Max forum posts per user per hour (all groups). */
export const COMMUNITY_POST_MAX_PER_HOUR_DEFAULT = 15;

/** Max forum posts per user per hour within one group. */
export const COMMUNITY_POST_MAX_PER_GROUP_HOUR_DEFAULT = 8;

/** Max forum posts per user per 24h. */
export const COMMUNITY_POST_MAX_PER_DAY_DEFAULT = 80;

/** Window to reject duplicate post body (seconds). */
export const COMMUNITY_POST_DUPLICATE_WINDOW_SEC_DEFAULT = 900;

/** Max http POST /threads/:id/posts per user per minute. */
export const COMMUNITY_SPAM_HTTP_POST_LIMIT_DEFAULT = 10;

/** Max http POST /groups/:id/threads per user per minute. */
export const COMMUNITY_SPAM_HTTP_THREAD_LIMIT_DEFAULT = 5;

/** Min seconds between new threads in one group. */
export const COMMUNITY_THREAD_COOLDOWN_SEC_DEFAULT = 60;

/** Max new threads per user per hour (all groups). */
export const COMMUNITY_THREAD_MAX_PER_HOUR_DEFAULT = 5;

/** Max URLs allowed in a single post body. */
export const COMMUNITY_POST_MAX_URLS_DEFAULT = 8;
