'use client';

import { useCallback, useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { REALTIME_EVENTS, type NotificationSummary, type RealtimeEnvelope } from '@family/shared';
import { Link } from '@/i18n/navigation';
import { useAuth } from '@/components/auth-provider';
import { Button } from '@/components/ui';
import { useRealtime } from '@/features/collaboration/use-realtime';
import { useWorkspaceId } from '@/features/collaboration/use-workspace-id';
import { apiClient, formatApiError } from '@/lib/api-client';

export function NotificationBell() {
  const { session } = useAuth();
  const workspaceId = useWorkspaceId();
  const t = useTranslations('notifications');
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState(0);
  const [items, setItems] = useState<NotificationSummary[]>([]);
  const [error, setError] = useState('');

  const reload = useCallback(async () => {
    if (!session?.accessToken) return;
    try {
      const [unread, list] = await Promise.all([
        apiClient.notifications.unreadCount(session.accessToken),
        apiClient.notifications.list(session.accessToken, true),
      ]);
      setCount(unread);
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
        setCount((c) => c + 1);
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

  return (
    <div className="relative">
      <Button variant="ghost" aria-label={t('title')} onClick={() => setOpen((v) => !v)}>
        <Bell className="h-4 w-4" />
        {count > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] text-white">
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
          {error ? <p className="text-xs text-rose-600">{error}</p> : null}
          <ul className="max-h-72 space-y-2 overflow-y-auto">
            {items.map((n) => (
              <li key={n.id} className="rounded-xl bg-stone-50 px-2 py-2 text-xs dark:bg-slate-900">
                <p className="font-medium">{n.title}</p>
                <p className="text-stone-500">{n.body}</p>
                {n.deepLink ? <Link href={n.deepLink} className="text-family-primary">{t('open')}</Link> : null}
              </li>
            ))}
            {items.length === 0 ? <li className="text-xs text-stone-500">{t('empty')}</li> : null}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
