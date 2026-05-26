'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { GamificationDashboardPayload } from '@family/shared';
import { Link } from '@/i18n/navigation';
import { useAuth } from '@/components/auth-provider';
import { AchievementBadges } from '@/features/gamification/achievement-badges';
import { MissingDataWidget } from '@/features/gamification/missing-data-widget';
import { ResearchProgressCard } from '@/features/gamification/research-progress-card';
import { apiClient, formatApiError } from '@/lib/api-client';

/** Compact gamification widgets for the main dashboard */
export function GamificationOverview() {
  const { session, isReady } = useAuth();
  const t = useTranslations('gamification.dashboard');
  const [data, setData] = useState<GamificationDashboardPayload | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!session?.accessToken) return;

    try {
      setError('');
      const payload = await apiClient.gamification.dashboard(session.accessToken);
      setData(payload);
    } catch (err) {
      setError(formatApiError(err));
    }
  }, [session?.accessToken]);

  useEffect(() => {
    if (!isReady) return;
    void load();
  }, [isReady, load]);

  if (!isReady) {
    return <p className="text-sm text-stone-500">{t('loading')}</p>;
  }

  if (error) {
    return <p className="text-sm text-rose-600">{error}</p>;
  }

  if (!data) {
    return <p className="text-sm text-stone-500">{t('loading')}</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-stone-500 dark:text-slate-400">{t('subtitle')}</p>
        <Link href="/research" className="text-sm font-semibold text-family-primary hover:underline dark:text-family-accent">
          {t('openResearch')}
        </Link>
      </div>

      <ResearchProgressCard
        compact
        researchProgress={data.researchProgress}
        treeProgress={data.treeProgress}
        userProgress={data.userProgress}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <MissingDataWidget compact gaps={data.gaps} />
        <AchievementBadges compact achievements={data.achievements} />
      </div>
    </div>
  );
}
