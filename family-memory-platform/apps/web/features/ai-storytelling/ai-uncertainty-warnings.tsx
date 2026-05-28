'use client';

import type { StoryDraftDto } from '@family/shared';

export function AIUncertaintyWarnings({ draft }: { draft: StoryDraftDto | null }) {
  if (!draft) return null;
  const warnings = draft.warnings ?? [];
  const hasAssumptions = draft.claims?.some((c) => c.isAssumption) ?? false;
  const hasUncertainty = typeof draft.uncertaintyScore === 'number' && draft.uncertaintyScore >= 0.5;

  if (warnings.length === 0 && !hasAssumptions && !hasUncertainty) return null;

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-700/40 dark:bg-amber-950/30 dark:text-amber-200">
      <p className="font-semibold">AI: предупреждения по источникам</p>
      <ul className="mt-2 list-disc space-y-1 pl-5">
        {hasUncertainty ? <li>Есть области с высокой неопределённостью (проверьте источники).</li> : null}
        {hasAssumptions ? <li>Часть утверждений помечена как предположение (assumption).</li> : null}
        {warnings.slice(0, 6).map((w, idx) => (
          <li key={idx}>{w.message}</li>
        ))}
      </ul>
    </div>
  );
}

