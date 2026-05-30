'use client';

import { AlertCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';

export function PhotoAiDegradationBanner() {
  const t = useTranslations('photoIntelligence');

  return (
    <div
      role="status"
      className="flex gap-3 rounded-2xl border border-amber-300/50 bg-amber-50/90 p-4 text-sm text-amber-950 dark:border-amber-500/30 dark:bg-amber-950/40 dark:text-amber-100"
    >
      <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
      <div className="space-y-1">
        <p className="font-semibold">{t('redisQueueUnavailableTitle')}</p>
        <p className="leading-relaxed text-amber-900/90 dark:text-amber-100/90">{t('redisQueueUnavailableBody')}</p>
        <p className="text-xs text-amber-800/80 dark:text-amber-200/70">{t('redisQueueUnavailableHint')}</p>
      </div>
    </div>
  );
}
