'use client';

import { useTranslations } from 'next-intl';

const ENTITY_COLORS: Record<string, string> = {
  PERSON: 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-100',
  DATE: 'bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-100',
  PLACE: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100',
  EVENT: 'bg-violet-100 text-violet-900 dark:bg-violet-950 dark:text-violet-100',
  SOURCE: 'bg-stone-200 text-stone-900 dark:bg-slate-800 dark:text-slate-100',
  OTHER: 'bg-stone-100 text-stone-800 dark:bg-slate-900 dark:text-slate-200',
};

interface EntityHighlighterProps {
  entitiesPayload: unknown;
  fallbackText: string;
}

export function EntityHighlighter({ entitiesPayload, fallbackText }: EntityHighlighterProps) {
  const t = useTranslations('documentIntelligence');
  const list =
    entitiesPayload &&
    typeof entitiesPayload === 'object' &&
    'entities' in entitiesPayload &&
    Array.isArray((entitiesPayload as { entities: unknown }).entities)
      ? (entitiesPayload as { entities: Array<{ type?: string; text?: string; label?: string }> }).entities
      : [];

  if (list.length === 0) {
    return (
      <div className="space-y-2">
        <p className="text-xs text-stone-500 dark:text-slate-400">{t('entitiesEmpty')}</p>
        <div className="max-h-[40vh] overflow-auto rounded-2xl border bg-stone-50 p-3 text-sm dark:bg-slate-950">
          <pre className="whitespace-pre-wrap font-sans">{fallbackText || '—'}</pre>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-stone-500 dark:text-slate-400">{t('entitiesHint')}</p>
      <ul className="flex flex-wrap gap-2">
        {list.map((e, i) => {
          const type = (e.type ?? 'OTHER').toString().toUpperCase();
          const color = ENTITY_COLORS[type] ?? ENTITY_COLORS.OTHER;
          return (
            <li key={i} className={`rounded-full px-3 py-1 text-xs font-medium ${color}`}>
              <span className="opacity-70">{type}</span> · {e.text ?? e.label ?? '—'}
            </li>
          );
        })}
      </ul>
      <div className="max-h-[30vh] overflow-auto rounded-2xl border bg-stone-50 p-3 text-sm dark:bg-slate-950">
        <pre className="whitespace-pre-wrap font-sans">{fallbackText || '—'}</pre>
      </div>
    </div>
  );
}
