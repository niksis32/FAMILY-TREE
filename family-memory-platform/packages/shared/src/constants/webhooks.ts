/** BullMQ queue for outbound webhook delivery */
export const WEBHOOK_DELIVERY_QUEUE = 'webhook-delivery';

/** Max HTTP delivery attempts before DEAD_LETTER */
/** After this many consecutive delivery failures the endpoint is auto-disabled. */
export const WEBHOOK_AUTO_DISABLE_AFTER = 10;

/** Outbound POST timeout */
export const WEBHOOK_HTTP_TIMEOUT_MS = 10_000;

/** Max registered endpoints per workspace */
export const WEBHOOK_MAX_ENDPOINTS_PER_WORKSPACE = 10;

/** Delay before retry after failure (attempt 1 = immediate) */
export const WEBHOOK_RETRY_DELAYS_MS = [0, 60_000, 300_000, 1_800_000, 7_200_000, 28_800_000] as const;

/** Max HTTP delivery attempts before DEAD_LETTER */
export const WEBHOOK_MAX_ATTEMPTS = WEBHOOK_RETRY_DELAYS_MS.length;

/** Feature flag key for workspace / global override */
export const WEBHOOKS_ENABLED_FLAG = 'WEBHOOKS_ENABLED';

/** Minimum match score to emit MATCH_FOUND webhook */
export const WEBHOOK_MATCH_MIN_SCORE = 0.75;
