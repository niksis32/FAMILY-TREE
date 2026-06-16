/** Redis pub/sub channel prefix for workspace-scoped realtime events */
export const REALTIME_CHANNEL_PREFIX = 'fmp:realtime';

export function realtimeWorkspaceChannel(workspaceId: string) {
  return `${REALTIME_CHANNEL_PREFIX}:workspace:${workspaceId}`;
}

export function realtimeUserChannel(userId: string) {
  return `${REALTIME_CHANNEL_PREFIX}:user:${userId}`;
}

/** WebSocket event names — shared contract between API and Web */
export const REALTIME_EVENTS = {
  MESSAGE_NEW: 'message.new',
  MESSAGE_READ: 'message.read',
  NOTIFICATION_NEW: 'notification.new',
  PRESENCE_UPDATE: 'presence.update',
  PERSON_LOCK: 'person.lock',
  PERSON_UNLOCK: 'person.unlock',
  PERSON_CONFLICT: 'person.conflict',
  ACTIVITY_NEW: 'activity.new',
} as const;

export type RealtimeEventName = (typeof REALTIME_EVENTS)[keyof typeof REALTIME_EVENTS];

/** Soft-lock TTL for collaborative Person editing (seconds) */
export const PERSON_EDIT_LOCK_TTL_SEC = 120;
