'use client';

import type { StoryDraftDto } from '@family/shared';
import { cn } from '@/lib/utils';

export function SourceReferencesPanel({ draft, className }: { draft: StoryDraftDto | null; className?: string }) {
  if (!draft) return null;

  const claims = draft.claims ?? [];
  const sources = claims.flatMap((c) => c.sources.map((s) => ({ claimId: c.id, claimText: c.text, ...s })));
  const unique = new Map<string, (typeof sources)[number]>();
  for (const s of sources) {
    const key = `${s.sourceType}:${s.sourceId ?? ''}:${s.label ?? ''}`;
    if (!unique.has(key)) unique.set(key, s);
  }
  const list = Array.from(unique.values());

  if (list.length === 0) return null;

  return (
    <div className={cn('rounded-3xl border p-5 dark:border-slate-800', className)}>
      <p className="text-sm font-semibold">Источники (references)</p>
      <p className="mt-1 text-xs text-stone-500 dark:text-slate-400">
        В stub-режиме ссылки минимальны. После подключения local-LLM здесь будет точная привязка к событиям/документам.
      </p>
      <ul className="mt-4 space-y-2 text-sm">
        {list.slice(0, 20).map((s, idx) => (
          <li key={idx} className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold text-stone-700 dark:bg-slate-900 dark:text-slate-300">
              {s.sourceType}
            </span>
            <span className="text-xs text-stone-600 dark:text-slate-300">
              {s.sourceId ? `id=${s.sourceId}` : s.label ?? '—'}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

