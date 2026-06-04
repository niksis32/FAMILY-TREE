'use client';

import { useTranslations } from 'next-intl';
import type { TreeDisplayMode } from './tree-view-data-context';

const MODES: Array<{ id: TreeDisplayMode; icon: string }> = [
  { id: 'classic', icon: '▦' },
  { id: 'graph', icon: '◎' },
  { id: 'three-d', icon: '⬡' },
  { id: 'timeline', icon: '▤' },
  { id: 'map', icon: '🗺' },
];

export function TreeViewSwitcher({
  mode,
  onChange,
}: {
  mode: TreeDisplayMode;
  onChange: (mode: TreeDisplayMode) => void;
}) {
  const t = useTranslations('treeExperience');

  return (
    <div className="max-w-full overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
    <div
      className="inline-flex min-w-max flex-nowrap gap-1 rounded-2xl border border-stone-200 bg-white/90 p-1 shadow-sm dark:border-slate-700 dark:bg-slate-900/90"
      role="tablist"
      aria-label={t('modeSwitcherLabel')}
    >
      {MODES.map((item) => (
        <button
          key={item.id}
          type="button"
          role="tab"
          aria-selected={mode === item.id}
          onClick={() => onChange(item.id)}
          className={`flex min-w-[4.5rem] flex-col items-center gap-0.5 rounded-xl px-3 py-2 text-xs font-semibold transition ${
            mode === item.id
              ? 'bg-family-primary text-white shadow dark:bg-family-accent dark:text-slate-950'
              : 'text-stone-600 hover:bg-stone-100 dark:text-slate-300 dark:hover:bg-slate-800'
          }`}
        >
          <span className="text-base leading-none">{item.icon}</span>
          <span>{t(`modes.${item.id}`)}</span>
        </button>
      ))}
    </div>
    </div>
  );
}
