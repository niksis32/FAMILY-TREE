import type { ReactNode } from 'react';
import { cn } from '../lib/cn';

export function WorkspacePanel({
  title,
  description,
  action,
  children,
  className,
  noPadding,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  noPadding?: boolean;
}) {
  return (
    <section
      className={cn(
        'overflow-hidden rounded-[1.35rem] border bg-white/90 shadow-premium dark:bg-slate-900/85',
        className,
      )}
    >
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-stone-200/80 px-5 py-4 dark:border-slate-800">
        <div>
          <h2 className="font-serif text-lg font-semibold text-family-ink dark:text-white">{title}</h2>
          {description ? <p className="mt-1 text-sm text-stone-500 dark:text-slate-400">{description}</p> : null}
        </div>
        {action}
      </header>
      <div className={cn(!noPadding && 'p-5')}>{children}</div>
    </section>
  );
}
