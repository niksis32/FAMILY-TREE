'use client';

import type { UserAchievementRecord } from '@family/shared';
import { useTranslations } from 'next-intl';
import { Badge, Card } from '@/components/ui';
import { cn } from '@/lib/utils';

interface AchievementBadgesProps {
  achievements: UserAchievementRecord[];
  compact?: boolean;
}

const tierOrder = ['archive', 'gold', 'silver', 'bronze'] as const;

export function AchievementBadges({ achievements, compact = false }: AchievementBadgesProps) {
  const t = useTranslations('gamification.achievements');

  const sorted = [...achievements].sort((a, b) => {
    const tierDiff = tierOrder.indexOf(a.tier) - tierOrder.indexOf(b.tier);
    if (tierDiff !== 0) return tierDiff;
    return a.unlocked === b.unlocked ? 0 : a.unlocked ? -1 : 1;
  });

  const unlockedCount = achievements.filter((a) => a.unlocked).length;

  return (
    <Card className={cn(compact && 'p-4')}>
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-stone-400">{t('eyebrow')}</p>
          <h2 className={cn('font-serif font-semibold', compact ? 'text-lg' : 'text-xl')}>{t('title')}</h2>
        </div>
        <Badge tone="gold">{t('unlocked', { count: unlockedCount, total: achievements.length })}</Badge>
      </div>

      <div className={cn('mt-4 grid gap-3', compact ? 'grid-cols-2' : 'sm:grid-cols-2')}>
        {(compact ? sorted.slice(0, 4) : sorted).map((item) => (
          <div
            key={item.achievementId}
            className={cn(
              'rounded-2xl border p-3 transition',
              item.unlocked
                ? 'border-family-accent/30 bg-family-accent/10'
                : 'border-stone-200 bg-stone-50/50 opacity-70 dark:border-slate-800 dark:bg-slate-950/30',
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <Badge tone={item.unlocked ? 'gold' : 'muted'}>{t(`tiers.${item.tier}`)}</Badge>
              {item.unlocked && <span className="text-xs text-emerald-600 dark:text-emerald-400">{t('earned')}</span>}
            </div>
            <p className="mt-2 text-sm font-medium">{t(`${item.achievementId}.title`)}</p>
            {!compact && (
              <p className="mt-1 text-xs text-stone-500 dark:text-slate-400">{t(`${item.achievementId}.description`)}</p>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}
