'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/components/auth-provider';
import { Card, StatCard } from '@/components/ui';
import { apiClient } from '@/lib/api-client';

export function DashboardOverview() {
  const { session } = useAuth();
  const t = useTranslations('dashboardOverview');
  const [stats, setStats] = useState({ persons: 0, families: 0, media: 0, documents: 0 });
  const [status, setStatus] = useState('');

  useEffect(() => {
    setStatus(t('loading'));
  }, [t]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [persons, families, media, documents] = await Promise.all([
          apiClient.persons.list(session?.accessToken),
          apiClient.families.list(session?.accessToken),
          apiClient.media.list(session?.accessToken),
          apiClient.documents.list(session?.accessToken),
        ]);
        if (cancelled) return;
        setStats({ persons: persons.length, families: families.length, media: media.length, documents: documents.length });
        setStatus(t('loaded'));
      } catch (error) {
        if (cancelled) return;
        setStatus(error instanceof Error ? error.message : t('loadFailed'));
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [session?.accessToken, t]);

  const checks = [t('check1'), t('check2'), t('check3'), t('check4')];

  return (
    <div className="space-y-6">
      <p className="text-sm text-stone-500 dark:text-slate-400">{status}</p>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label={t('statPersons')} value={String(stats.persons)} hint={t('hintPersons')} />
        <StatCard label={t('statFamilies')} value={String(stats.families)} hint={t('hintFamilies')} />
        <StatCard label={t('statMedia')} value={String(stats.media)} hint={t('hintMedia')} />
        <StatCard label={t('statDocuments')} value={String(stats.documents)} hint={t('hintDocuments')} />
      </div>

      <Card>
        <h2 className="text-xl font-semibold">{t('runtimeChecksTitle')}</h2>
        <div className="mt-5 grid gap-3">
          {checks.map((item) => (
            <div key={item} className="rounded-2xl border bg-stone-50 p-4 text-sm dark:bg-slate-950">
              {item}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
