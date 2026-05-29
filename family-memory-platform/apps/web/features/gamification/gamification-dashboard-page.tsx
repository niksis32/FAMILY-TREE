'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { GamificationDashboardPayload } from '@family/shared';
import { useAuth } from '@/components/auth-provider';
import { PageHero } from '@family/ui';
import { AchievementBadges } from '@/features/gamification/achievement-badges';
import { FamilyMysteryCard } from '@/features/gamification/family-mystery-card';
import { MissingDataWidget } from '@/features/gamification/missing-data-widget';
import { QuestDashboard } from '@/features/gamification/quest-dashboard';
import { ResearchProgressCard } from '@/features/gamification/research-progress-card';
import { apiClient, formatApiError } from '@/lib/api-client';

export function GamificationDashboardPage() {
  const { session, isReady } = useAuth();
  const t = useTranslations('gamification.dashboard');
  const tPages = useTranslations('pages.research');
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

  return (
    <div className="space-y-8">
      <PageHero eyebrow={tPages('eyebrow')} title={tPages('title')} description={tPages('description')} />

      {error && <p className="text-sm text-rose-600">{error}</p>}
      {(!isReady || (!data && !error)) && <p className="text-sm text-stone-500">{t('loading')}</p>}

      {data && (
        <>
          <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
            <ResearchProgressCard
              researchProgress={data.researchProgress}
              treeProgress={data.treeProgress}
              userProgress={data.userProgress}
            />
            <FamilyMysteryCard mysteries={data.mysteries} discoveryScore={data.discoveryScore} />
          </div>

          <QuestDashboard quests={data.quests} weeklyGoals={data.weeklyGoals} />

          <div className="grid gap-6 lg:grid-cols-2">
            <AchievementBadges achievements={data.achievements} />
            <MissingDataWidget gaps={data.gaps} />
          </div>
        </>
      )}
    </div>
  );
}
