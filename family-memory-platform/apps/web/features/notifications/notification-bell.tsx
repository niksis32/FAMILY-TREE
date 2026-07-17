'use client';

import { useCallback, useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { REALTIME_EVENTS, isModerationInboxNotification, type NotificationSummary, type RealtimeEnvelope } from '@family/shared';
import { Link } from '@/i18n/navigation';
import { useAuth } from '@/components/auth-provider';
import { Button } from '@/components/ui';
import { useRealtime } from '@/features/collaboration/use-realtime';
import { useWorkspaceId } from '@/features/collaboration/use-workspace-id';
import { apiClient, formatApiError } from '@/lib/api-client';
import { cn } from '@/lib/utils';

function isModerationUnread(note: NotificationSummary) {
  return isModerationInboxNotification(note);
}

function resolveNotificationHref(note: NotificationSummary): string | null {
  if (!note.deepLink && !note.sourceId) return null;
  if (isModerationInboxNotification(note)) {
    if (note.deepLink?.includes('/admin/moderation/military-history')) return note.deepLink;
    if (note.sourceId) return `/admin/moderation/military-history?review=${note.sourceId}`;
    return '/admin/moderation/military-history';
  }
  return note.deepLink;
}

export function NotificationBell() {
  const { session } = useAuth();
  const workspaceId = useWorkspaceId();
  const t = useTranslations('notifications');
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState(0);
  const [moderationCount, setModerationCount] = useState(0);
  const [items, setItems] = useState<NotificationSummary[]>([]);
  const [error, setError] = useState('');

  const reload = useCallback(async () => {
    if (!session?.accessToken) return;
    try {
      const [unread, list] = await Promise.all([
        apiClient.notifications.unreadCount(session.accessToken),
        apiClient.notifications.list(session.accessToken, true),
      ]);
      setCount(unread.total);
      setModerationCount(unread.moderation);
      setItems(list.slice(0, 8));
      setError('');
    } catch (err) {
      setError(formatApiError(err));
    }
  }, [session?.accessToken]);

  useRealtime({
    token: session?.accessToken,
    workspaceId,
    enabled: Boolean(session?.accessToken),
    onEvent: (envelope: RealtimeEnvelope) => {
      if (envelope.event === REALTIME_EVENTS.NOTIFICATION_NEW) {
        const note = envelope.payload as NotificationSummary;
        if (note.userId !== session?.user.id) return;
        setCount((c) => c + 1);
        if (isModerationInboxNotification(note)) {
          setModerationCount((c) => c + 1);
        }
        setItems((prev) => [note, ...prev].slice(0, 8));
      }
    },
  });

  useEffect(() => {
    void reload();
  }, [reload]);

  async function markAllRead() {
    if (!session?.accessToken) return;
    await apiClient.notifications.markAllRead(session.accessToken);
    void reload();
  }

  const hasModerationAlert = moderationCount > 0;

  return (
    <div className="relative">
      <Button
        variant="ghost"
        aria-label={t('title')}
        onClick={() => setOpen((v) => !v)}
        className={cn(hasModerationAlert && 'text-amber-600 hover:text-amber-700 dark:text-amber-400')}
      >
        <Bell className={cn('h-4 w-4', hasModerationAlert && 'animate-pulse')} />
        {count > 0 ? (
          <span
            className={cn(
              'absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white shadow-lg',
              hasModerationAlert
                ? 'animate-pulse bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500 ring-2 ring-amber-300/80'
                : 'bg-rose-500',
            )}
          >
            {count > 9 ? '9+' : count}
          </span>
        ) : null}
      </Button>

      {open ? (
        <div className="absolute right-0 z-50 mt-2 w-80 rounded-2xl border bg-white p-3 shadow-xl dark:border-slate-700 dark:bg-slate-950">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold">{t('title')}</p>
            <button type="button" className="text-xs text-family-primary" onClick={() => void markAllRead()}>
              {t('markAllRead')}
            </button>
          </div>
          {hasModerationAlert ? (
            <p className="mb-2 rounded-xl bg-gradient-to-r from-amber-100 to-orange-100 px-2 py-1.5 text-xs font-semibold text-amber-950 dark:from-amber-950/60 dark:to-orange-950/40 dark:text-amber-100">
              {t('moderationAlert', { count: moderationCount })}
            </p>
          ) : null}
          {error ? <p className="text-xs text-rose-600">{error}</p> : null}
          <ul className="max-h-72 space-y-2 overflow-y-auto">
            {items.map((n) => {
              const moderation = isModerationUnread(n);
              return (
                <li
                  key={n.id}
                  className={cn(
                    'rounded-xl px-2 py-2 text-xs',
                    moderation
                      ? 'border border-amber-300/80 bg-gradient-to-br from-amber-50 to-orange-50 dark:border-amber-700/60 dark:from-amber-950/50 dark:to-orange-950/30'
                      : 'bg-stone-50 dark:bg-slate-900',
                  )}
                >
                  {moderation ? (
                    <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-orange-600 dark:text-amber-400">
                      {t('moderationBadge')}
                    </p>
                  ) : null}
                  <p className="font-medium">{n.title}</p>
                  <p className="text-stone-500 dark:text-slate-400">{n.body}</p>
                  {resolveNotificationHref(n) ? (
                    <Link
                      href={resolveNotificationHref(n)!}
                      className="font-medium text-orange-600 dark:text-amber-400"
                      onClick={() => setOpen(false)}
                    >
                      {isModerationInboxNotification(n) ? t('openAdminModeration') : t('open')}
                    </Link>
                  ) : null}
                </li>
              );
            })}
            {items.length === 0 ? <li className="text-xs text-stone-500">{t('empty')}</li> : null}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
