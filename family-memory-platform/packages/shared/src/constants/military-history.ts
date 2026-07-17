/** Moderator inbox title when a user proposes a new military conflict label. */
export const MILITARY_CONFLICT_MODERATION_INBOX_TITLE = 'Новый пункт «Война или конфликт»';

export function isModerationInboxNotification(note: {
  source: string;
  title: string;
  readAt: string | null;
}): boolean {
  return note.source === 'MODERATION' && note.title === MILITARY_CONFLICT_MODERATION_INBOX_TITLE && !note.readAt;
}
