'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { REALTIME_EVENTS, type ActivityEventSummary, type RealtimeEnvelope } from '@family/shared';
import { Link } from '@/i18n/navigation';
import { useAuth } from '@/components/auth-provider';
import { useRealtime } from '@/features/collaboration/use-realtime';
import { useWorkspaceId } from '@/features/collaboration/use-workspace-id';
import { apiClient, formatApiError } from '@/lib/api-client';

export function ActivityFeedPanel() {
  const { session, isReady } = useAuth();
  const workspaceId = useWorkspaceId();
  const t = useTranslations('activityFeed');
  const [items, setItems] = useState<ActivityEventSummary[]>([]);
  const [error, setError] = useState('');

  const reload = useCallback(async () => {
    if (!session?.accessToken) return;
    const res = await apiClient.activityFeed.list(session.accessToken, { limit: 8 });
    setItems(res.items);
  }, [session?.accessToken]);

  useRealtime({
    token: session?.accessToken,
    workspaceId,
    enabled: Boolean(session?.accessToken && workspaceId),
    onEvent: (envelope: RealtimeEnvelope) => {
      if (envelope.event === REALTIME_EVENTS.ACTIVITY_NEW) {
        const item = envelope.payload as ActivityEventSummary;
        setItems((prev) => [item, ...prev].slice(0, 8));
      }
    },
  });

  useEffect(() => {
    if (!isReady || !session?.accessToken) return;
    void reload().catch((err) => setError(formatApiError(err)));
  }, [isReady, session?.accessToken, reload]);

  return (
    <section className="rounded-2xl border bg-white/80 p-4 dark:border-slate-800 dark:bg-slate-950/60">
      <h2 className="font-serif text-lg font-semibold">{t('title')}</h2>
      {error ? <p className="mt-2 text-sm text-rose-600">{error}</p> : null}
      <ul className="mt-3 space-y-2">
        {items.map((item) => (
          <li key={item.id} className="rounded-xl bg-stone-50 px-3 py-2 text-sm dark:bg-slate-900/60">
            <p>{item.summary}</p>
            <p className="text-xs text-stone-500">
              {item.actorName ?? t('system')} · {new Date(item.createdAt).toLocaleString()}
            </p>
            {item.deepLink ? (
              <Link href={item.deepLink} className="text-xs text-family-primary hover:underline">{t('open')}</Link>
            ) : null}
          </li>
        ))}
        {items.length === 0 ? <li className="text-sm text-stone-500">{t('empty')}</li> : null}
      </ul>
    </section>
  );
}
