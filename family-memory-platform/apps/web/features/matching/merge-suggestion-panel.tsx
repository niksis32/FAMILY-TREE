'use client';

import { useTranslations } from 'next-intl';

export function MergeSuggestionPanel({
  sourcePersonId,
  targetPersonId,
  message,
}: {
  sourcePersonId: string;
  targetPersonId: string;
  message?: string;
}) {
  const t = useTranslations('matching');

  return (
    <aside className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4 dark:border-amber-900/50 dark:bg-amber-950/30">
      <h3 className="font-semibold text-amber-900 dark:text-amber-100">{t('mergeTitle')}</h3>
      <p className="mt-2 text-sm text-amber-800 dark:text-amber-200/90">{message ?? t('mergeHint')}</p>
      <p className="mt-3 font-mono text-xs text-stone-500">
        {sourcePersonId} → {targetPersonId}
      </p>
    </aside>
  );
}
