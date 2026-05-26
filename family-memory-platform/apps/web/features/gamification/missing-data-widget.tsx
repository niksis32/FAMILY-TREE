'use client';

import type { MissingDataGap } from '@family/shared';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { gapHintMessageKey } from '@/features/gamification/gap-hint-key';
import { Badge, Card } from '@/components/ui';

interface MissingDataWidgetProps {
  gaps: MissingDataGap[];
  compact?: boolean;
}

const severityTone = {
  critical: 'red',
  high: 'gold',
  medium: 'blue',
  low: 'muted',
} as const;

export function MissingDataWidget({ gaps, compact = false }: MissingDataWidgetProps) {
  const t = useTranslations('gamification.missingData');
  const items = compact ? gaps.slice(0, 3) : gaps;

  return (
    <Card className={compact ? 'p-4' : undefined}>
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-stone-400">{t('eyebrow')}</p>
          <h2 className="font-serif text-xl font-semibold">{t('title')}</h2>
        </div>
        <Badge tone="red">{t('count', { count: gaps.length })}</Badge>
      </div>

      <div className="mt-4 space-y-3">
        {items.map((gap) => (
          <div key={`${gap.entityId}-${gap.code}`} className="rounded-2xl border bg-stone-50/80 p-3 dark:bg-slate-950/40">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-medium">{gap.entityLabel}</p>
                <p className="mt-1 text-sm text-stone-500 dark:text-slate-400">
                  {t(gapHintMessageKey(gap.hintKey) as never)}
                </p>
              </div>
              <Badge tone={severityTone[gap.severity]}>{t(`severity.${gap.severity}`)}</Badge>
            </div>
            {gap.entityType === 'person' && (
              <Link href={`/persons/${gap.entityId}`} className="mt-2 inline-block text-sm font-semibold text-family-primary hover:underline dark:text-family-accent">
                {t('resolve')}
              </Link>
            )}
          </div>
        ))}
      </div>

      {compact && gaps.length > 3 && (
        <Link href="/research" className="mt-4 inline-block text-sm font-semibold text-family-primary dark:text-family-accent">
          {t('viewAll')}
        </Link>
      )}
    </Card>
  );
}
