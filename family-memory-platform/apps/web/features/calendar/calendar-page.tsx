'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { CalendarEventSummary } from '@family/shared';
import { Link } from '@/i18n/navigation';
import { useAuth } from '@/components/auth-provider';
import { Button } from '@/components/ui';
import { PageHero } from '@family/ui';
import { apiClient, formatApiError } from '@/lib/api-client';

export function CalendarPage() {
  const { session, isReady } = useAuth();
  const t = useTranslations('calendar');
  const [events, setEvents] = useState<CalendarEventSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!session?.accessToken) return;
    setLoading(true);
    setError('');
    try {
      const rows = await apiClient.calendar.listEvents(session.accessToken);
      setEvents(rows);
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setLoading(false);
    }
  }, [session?.accessToken]);

  useEffect(() => {
    if (!isReady) return;
    void load();
  }, [isReady, load]);

  async function downloadIcal() {
    if (!session?.accessToken) return;
    try {
      const text = await apiClient.calendar.downloadIcal(session.accessToken);
      const blob = new Blob([text], { type: 'text/calendar;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'family-calendar.ics';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(formatApiError(err));
    }
  }

  return (
    <div className="space-y-6">
      <PageHero
        eyebrow={t('eyebrow')}
        title={t('title')}
        description={t('description')}
        action={<Button variant="secondary" onClick={() => void downloadIcal()}>{t('exportIcal')}</Button>}
      />
      {error ? <p className="text-sm text-rose-600" role="alert">{error}</p> : null}

      <div className="rounded-2xl border bg-white/80 dark:border-slate-800 dark:bg-slate-950/60">
        {loading ? <p className="p-4 text-sm text-stone-500">{t('loading')}</p> : null}
        <ul className="divide-y dark:divide-slate-800">
          {events.map((ev) => (
            <li key={ev.id} className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
              <div>
                <p className="font-medium">{ev.title}</p>
                <p className="text-xs text-stone-500">{new Date(ev.date).toLocaleDateString()} · {ev.kind}</p>
              </div>
              {ev.deepLink ? (
                <Link href={ev.deepLink} className="text-family-primary hover:underline">{t('open')}</Link>
              ) : null}
            </li>
          ))}
          {!loading && events.length === 0 ? <li className="p-4 text-sm text-stone-500">{t('empty')}</li> : null}
        </ul>
      </div>
    </div>
  );
}
