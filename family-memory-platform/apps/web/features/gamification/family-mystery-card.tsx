'use client';

import type { FamilyDiscoveryScore, FamilyMystery } from '@family/shared';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { gapHintMessageKey } from '@/features/gamification/gap-hint-key';
import { Badge, Card } from '@/components/ui';

interface FamilyMysteryCardProps {
  mysteries: FamilyMystery[];
  discoveryScore?: FamilyDiscoveryScore;
}

export function FamilyMysteryCard({ mysteries, discoveryScore }: FamilyMysteryCardProps) {
  const t = useTranslations('gamification.familyMystery');
  const tGaps = useTranslations('gamification.missingData');
  const mystery = mysteries[0];

  return (
    <Card className="border-family-primary/20 bg-gradient-to-br from-white/90 to-stone-50/80 dark:from-slate-900/90 dark:to-slate-950/80">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-stone-400">{t('eyebrow')}</p>
          <h2 className="font-serif text-2xl font-semibold text-family-ink dark:text-white">{t('title')}</h2>
        </div>
        {discoveryScore && (
          <div className="text-right">
            <p className="text-2xl font-semibold text-family-accent">{discoveryScore.total}</p>
            <p className="text-xs text-stone-500">{t('discoveryScore')}</p>
          </div>
        )}
      </div>

      {mystery ? (
        <div className="mt-5 rounded-2xl border border-dashed border-family-accent/40 bg-family-accent/5 p-4">
          <Badge tone="gold">{t(`severity.${mystery.severity}`)}</Badge>
          <p className="mt-3 font-serif text-lg">{mystery.personName ?? t('unknownSubject')}</p>
          <p className="mt-2 text-sm text-stone-600 dark:text-slate-300">
            {tGaps(gapHintMessageKey(mystery.descriptionKey) as never)}
          </p>
          <Link
            href={mystery.ctaHref}
            className="mt-4 inline-flex text-sm font-semibold text-family-primary hover:underline dark:text-family-accent"
          >
            {t('cta')}
          </Link>
        </div>
      ) : (
        <p className="mt-4 text-sm text-stone-500">{t('none')}</p>
      )}

      {mysteries.length > 1 && (
        <div className="mt-4 space-y-2">
          {mysteries.slice(1, 4).map((item) => (
            <Link
              key={item.id}
              href={item.ctaHref}
              className="block rounded-xl border px-3 py-2 text-sm hover:bg-stone-50 dark:hover:bg-slate-900"
            >
              {item.personName ?? t('unknownSubject')}
            </Link>
          ))}
        </div>
      )}
    </Card>
  );
}
