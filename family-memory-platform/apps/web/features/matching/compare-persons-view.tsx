'use client';

import type { TreeMatchCandidateDto } from '@family/shared';
import { useTranslations } from 'next-intl';

export function ComparePersonsView({ candidate }: { candidate: TreeMatchCandidateDto }) {
  const t = useTranslations('matching');

  const columns = [
    { label: t('source'), person: candidate.sourcePerson },
    { label: t('target'), person: candidate.targetPerson },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {columns.map(({ label, person }) => (
        <div key={label} className="rounded-2xl border p-4 dark:border-slate-700">
          <p className="text-xs uppercase tracking-wider text-stone-400">{label}</p>
          <p className="mt-2 text-xl font-semibold">{person?.displayName ?? '—'}</p>
          <dl className="mt-3 space-y-1 text-sm text-stone-600 dark:text-slate-300">
            <div className="flex justify-between">
              <dt>Birth</dt>
              <dd>{person?.birthYear ?? '—'}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Death</dt>
              <dd>{person?.deathYear ?? '—'}</dd>
            </div>
            {person?.workspaceLabel && (
              <div className="flex justify-between">
                <dt>Workspace</dt>
                <dd>{person.workspaceLabel}</dd>
              </div>
            )}
          </dl>
        </div>
      ))}
    </div>
  );
}
