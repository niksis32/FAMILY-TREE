'use client';

import type { TreeMatchCandidateDto } from '@family/shared';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui';

export function MatchCandidateCard({
  candidate,
  onAccept,
  onReject,
  busy,
}: {
  candidate: TreeMatchCandidateDto;
  onAccept?: () => void;
  onReject?: () => void;
  busy?: boolean;
}) {
  const t = useTranslations('matching');
  const source = candidate.sourcePerson?.displayName ?? candidate.sourcePersonId;
  const target = candidate.targetPerson?.displayName ?? candidate.targetPersonId;

  return (
    <article className="rounded-2xl border bg-white/80 p-4 shadow-sm dark:bg-slate-900/60">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wider text-stone-400">{t('score')}</p>
          <p className="text-2xl font-semibold text-family-primary">{Math.round(candidate.score * 100)}%</p>
          <p className="mt-1 text-sm text-stone-500">
            {source} ↔ {target}
          </p>
          <p className="text-xs text-stone-400">
            {t('status')}: {candidate.status}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/matching/compare/${candidate.id}`}>
            <Button variant="secondary">{t('compare')}</Button>
          </Link>
          {onAccept && (
            <Button disabled={busy} onClick={onAccept}>
              {t('accept')}
            </Button>
          )}
          {onReject && (
            <Button variant="ghost" disabled={busy} onClick={onReject}>
              {t('reject')}
            </Button>
          )}
        </div>
      </div>
      {candidate.reasons.length > 0 && (
        <ul className="mt-3 space-y-1 text-sm text-stone-600 dark:text-slate-300">
          {candidate.reasons.slice(0, 4).map((r, i) => (
            <li key={`${r.type}-${i}`}>
              <span className="font-medium">{r.type}</span>: {r.explanation}
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}
