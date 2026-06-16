export const WEBHOOK_EVENT_TYPES = [
  'PERSON_CREATED',
  'MEDIA_UPLOADED',
  'STORY_PUBLISHED',
  'MATCH_FOUND',
  'MESSAGE_CREATED',
  'PING',
] as const;

export type WebhookEventType = (typeof WEBHOOK_EVENT_TYPES)[number];

export const WEBHOOK_EVENT_STATUSES = [
  'PENDING',
  'DELIVERING',
  'DELIVERED',
  'FAILED',
  'DEAD_LETTER',
  'CANCELLED',
] as const;

export type WebhookEventStatus = (typeof WEBHOOK_EVENT_STATUSES)[number];

export const WEBHOOK_ENDPOINT_STATUSES = ['ACTIVE', 'DISABLED'] as const;

export type WebhookEndpointStatus = (typeof WEBHOOK_ENDPOINT_STATUSES)[number];

export interface WebhookEndpointSummary {
  id: string;
  url: string;
  description: string | null;
  status: WebhookEndpointStatus;
  subscribedEvents: WebhookEventType[];
  secretPrefix: string;
  lastSuccessAt: string | null;
  consecutiveFailures: number;
  createdAt: string;
  updatedAt: string;
}

export interface WebhookEndpointCreateResult extends WebhookEndpointSummary {
  /** Shown once — not stored in plaintext */
  secret: string;
}

export interface WebhookDeliveryAttemptSummary {
  id: string;
  attemptNumber: number;
  httpStatus: number | null;
  responseBodySnippet: string | null;
  durationMs: number;
  errorMessage: string | null;
  createdAt: string;
}

export interface WebhookEventSummary {
  id: string;
  endpointId: string;
  eventType: WebhookEventType;
  status: WebhookEventStatus;
  entityType: string | null;
  entityId: string | null;
  attemptCount: number;
  nextRetryAt: string | null;
  deliveredAt: string | null;
  lastError: string | null;
  createdAt: string;
}

export interface WebhookEventDetail extends WebhookEventSummary {
  payload: Record<string, unknown>;
  attempts: WebhookDeliveryAttemptSummary[];
}

export function webhookEventTypeToDot(type: WebhookEventType): string {
  const map: Record<WebhookEventType, string> = {
    PERSON_CREATED: 'person.created',
    MEDIA_UPLOADED: 'media.uploaded',
    STORY_PUBLISHED: 'story.published',
    MATCH_FOUND: 'match.found',
    MESSAGE_CREATED: 'message.created',
    PING: 'ping',
  };
  return map[type];
}
