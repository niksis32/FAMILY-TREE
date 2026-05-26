'use client';

import type { ResearchProgressSnapshot, TreeResearchProgress, UserResearchProgress } from '@family/shared';
import { useTranslations } from 'next-intl';
import { Card, StatCard } from '@/components/ui';
import { cn } from '@/lib/utils';

interface ResearchProgressCardProps {
  researchProgress: ResearchProgressSnapshot;
  treeProgress?: TreeResearchProgress;
  userProgress?: UserResearchProgress | null;
  compact?: boolean;
}

export function ResearchProgressCard({
  researchProgress,
  treeProgress,
  userProgress,
  compact = false,
}: ResearchProgressCardProps) {
  const t = useTranslations('gamification.researchProgress');

  return (
    <Card className={cn(compact && 'p-4')}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-stone-400">{t('eyebrow')}</p>
          <h2 className={cn('font-serif font-semibold text-family-ink dark:text-white', compact ? 'text-xl' : 'text-2xl')}>
            {t('title')}
          </h2>
        </div>
        <div className="text-right">
          <p className="text-3xl font-semibold text-family-primary dark:text-family-accent">{researchProgress.overallPercent}%</p>
          <p className="text-xs text-stone-500">{t('overall')}</p>
        </div>
      </div>

      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-stone-200 dark:bg-slate-800">
        <div
          className="h-full rounded-full bg-family-accent transition-all duration-500"
          style={{ width: `${researchProgress.overallPercent}%` }}
        />
      </div>

      {!compact && (
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {researchProgress.categories.map((cat) => (
            <div key={cat.key} className="rounded-2xl border bg-stone-50/80 p-3 dark:bg-slate-950/50">
              <div className="flex items-center justify-between text-sm">
                <span className="text-stone-600 dark:text-slate-300">{t(`categories.${cat.key}`)}</span>
                <span className="font-semibold">{cat.percent}%</span>
              </div>
              <div className="mt-2 h-1 overflow-hidden rounded-full bg-stone-200 dark:bg-slate-800">
                <div className="h-full bg-family-primary/70 dark:bg-family-accent/70" style={{ width: `${cat.percent}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {treeProgress && (
        <div className={cn('grid gap-3', compact ? 'mt-4 md:grid-cols-2' : 'mt-6 md:grid-cols-4')}>
          <StatCard label={t('persons')} value={String(treeProgress.personCount)} hint={t('personsHint')} />
          <StatCard label={t('documented')} value={`${treeProgress.documentedPercent}%`} hint={t('documentedHint')} />
          {!compact && (
            <>
              <StatCard label={t('sourced')} value={String(treeProgress.sourcedFacts)} hint={t('sourcedHint')} />
              <StatCard label={t('photos')} value={String(treeProgress.identifiedPhotos)} hint={t('photosHint')} />
            </>
          )}
        </div>
      )}

      {userProgress && !compact && (
        <div className="mt-4 flex flex-wrap gap-4 text-sm text-stone-500 dark:text-slate-400">
          <span>{t('actionsWeek', { count: userProgress.actionsThisWeek })}</span>
          <span>{t('streak', { days: userProgress.streakDays })}</span>
        </div>
      )}
    </Card>
  );
}
