import type { REALTIME_EVENTS } from '../constants/realtime';

export type ConversationType = 'DIRECT' | 'GROUP' | 'CONTEXT';
export type ConversationContextType = 'PERSON' | 'FAMILY' | 'EVENT' | 'MATCH';

export type NotificationSource =
  | 'MESSENGER'
  | 'MATCH'
  | 'MODERATION'
  | 'INVITE'
  | 'CALENDAR'
  | 'ACTIVITY'
  | 'SYSTEM';

export type ActivityEventType =
  | 'PERSON_CREATED'
  | 'PERSON_UPDATED'
  | 'MEDIA_UPLOADED'
  | 'DOCUMENT_UPLOADED'
  | 'MATCH_FOUND'
  | 'MESSAGE_SENT'
  | 'INVITE_SENT'
  | 'STORY_PUBLISHED'
  | 'RELATIONSHIP_ADDED'
  | 'CUSTOM';

export type CalendarEventKind =
  | 'BIRTH'
  | 'DEATH'
  | 'MARRIAGE'
  | 'ANNIVERSARY'
  | 'CUSTOM'
  | 'REMINDER';

export interface ConversationParticipantSummary {
  userId: string;
  displayName: string | null;
  email: string;
  lastReadAt: string | null;
}

export interface ConversationSummary {
  id: string;
  workspaceId: string;
  type: ConversationType;
  title: string | null;
  contextType: ConversationContextType | null;
  contextId: string | null;
  unreadCount: number;
  lastMessage: MessageSummary | null;
  participants: ConversationParticipantSummary[];
  updatedAt: string;
  createdAt: string;
}

export interface MessageAttachmentSummary {
  id: string;
  mediaId: string;
  fileName: string | null;
  mimeType: string | null;
}

export interface MessageSummary {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string | null;
  body: string;
  attachments: MessageAttachmentSummary[];
  createdAt: string;
  readByMe: boolean;
}

export interface NotificationSummary {
  id: string;
  workspaceId: string;
  source: NotificationSource;
  title: string;
  body: string;
  deepLink: string | null;
  sourceId: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationPreferenceSummary {
  source: NotificationSource;
  enabled: boolean;
}

export interface ActivityEventSummary {
  id: string;
  workspaceId: string;
  actorUserId: string | null;
  actorName: string | null;
  type: ActivityEventType;
  summary: string;
  deepLink: string | null;
  entityType: string | null;
  entityId: string | null;
  createdAt: string;
}

export interface ActivityFeedResponse {
  items: ActivityEventSummary[];
  nextCursor: string | null;
}

export interface CalendarEventSummary {
  id: string;
  kind: CalendarEventKind;
  title: string;
  date: string;
  endDate: string | null;
  personId: string | null;
  eventId: string | null;
  deepLink: string | null;
  allDay: boolean;
}

export interface PersonEditLockSummary {
  personId: string;
  userId: string;
  userName: string | null;
  field: string | null;
  acquiredAt: string;
  expiresAt: string;
}

export interface PersonPresenceSummary {
  personId: string;
  viewers: Array<{ userId: string; displayName: string | null }>;
  lock: PersonEditLockSummary | null;
}

export interface RealtimeEnvelope<T = unknown> {
  event: (typeof REALTIME_EVENTS)[keyof typeof REALTIME_EVENTS];
  workspaceId: string;
  payload: T;
  emittedAt: string;
}
