'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { CalendarEventSummary } from '@family/shared';
import { useAuth } from '@/components/auth-provider';
import { Button } from '@/components/ui';
import { PageHero } from '@family/ui';
import { apiClient, formatApiError } from '@/lib/api-client';
import { CalendarGrid } from './calendar-grid';

function yearBounds(date: Date) {
  const from = new Date(date.getFullYear(), 0, 1);
  const to = new Date(date.getFullYear() + 1, 11, 31);
  return { from: from.toISOString(), to: to.toISOString() };
}

export function CalendarPage() {
  const { session, isReady } = useAuth();
  const t = useTranslations('calendar');
  const [events, setEvents] = useState<CalendarEventSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const range = useMemo(() => yearBounds(new Date()), []);

  const load = useCallback(async () => {
    if (!session?.accessToken) return;
    setLoading(true);
    setError('');
    try {
      const rows = await apiClient.calendar.listEvents(session.accessToken, range.from, range.to);
      setEvents(rows);
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setLoading(false);
    }
  }, [session?.accessToken, range.from, range.to]);

  useEffect(() => {
    if (!isReady) return;
    void load();
  }, [isReady, load]);

  async function downloadIcal() {
    if (!session?.accessToken) return;
    try {
      const text = await apiClient.calendar.downloadIcal(session.accessToken, range.from, range.to);
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

      <CalendarGrid events={events} loading={loading} />

      {!loading && events.length === 0 ? (
        <p className="text-center text-sm text-stone-500">{t('empty')}</p>
      ) : null}
    </div>
  );
}
