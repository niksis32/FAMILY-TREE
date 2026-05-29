import type { ReactNode } from 'react';
import { cn } from '../lib/cn';

export interface RecordListItem {
  id: string;
  title: string;
  subtitle?: string;
  meta?: string;
  actions?: ReactNode;
  active?: boolean;
  onSelect?: () => void;
}

export function RecordList({
  items,
  emptyTitle,
  emptyDescription,
}: {
  items: RecordListItem[];
  emptyTitle: string;
  emptyDescription?: string;
}) {
  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-stone-300/80 bg-stone-50/50 px-5 py-10 text-center dark:border-slate-700 dark:bg-slate-950/40">
        <p className="font-serif font-semibold text-family-ink dark:text-white">{emptyTitle}</p>
        {emptyDescription ? (
          <p className="mt-2 text-sm text-stone-500 dark:text-slate-400">{emptyDescription}</p>
        ) : null}
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item.id}>
          <div
            className={cn(
              'flex flex-col gap-3 rounded-2xl border px-4 py-3 transition sm:flex-row sm:items-center sm:justify-between',
              item.active
                ? 'border-family-accent/50 bg-family-accent/8 shadow-sm dark:bg-family-accent/10'
                : 'border-stone-200/80 bg-stone-50/60 hover:border-family-primary/25 dark:border-slate-800 dark:bg-slate-950/60',
            )}
          >
            <button
              type="button"
              className="min-w-0 flex-1 text-left"
              onClick={item.onSelect}
              disabled={!item.onSelect}
            >
              <p className="truncate font-semibold text-family-ink dark:text-white">{item.title}</p>
              {item.subtitle ? (
                <p className="mt-0.5 truncate text-sm text-stone-500 dark:text-slate-400">{item.subtitle}</p>
              ) : null}
              {item.meta ? <p className="mt-1 text-xs text-stone-400">{item.meta}</p> : null}
            </button>
            {item.actions ? <div className="flex shrink-0 flex-wrap gap-2">{item.actions}</div> : null}
          </div>
        </li>
      ))}
    </ul>
  );
}
