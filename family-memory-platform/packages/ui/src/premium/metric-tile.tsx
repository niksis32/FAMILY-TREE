import type { ReactNode } from 'react';
import { cn } from '../lib/cn';

export function MetricTile({
  label,
  value,
  hint,
  icon,
  tone = 'default',
}: {
  label: string;
  value: string;
  hint?: string;
  icon?: ReactNode;
  tone?: 'default' | 'gold' | 'ink';
}) {
  return (
    <article
      className={cn(
        'group rounded-[1.35rem] border bg-white/90 p-5 shadow-premium backdrop-blur transition duration-300 hover:-translate-y-0.5 dark:bg-slate-900/85',
        tone === 'gold' && 'border-family-accent/30 bg-gradient-to-br from-family-accent/5 to-white dark:from-family-accent/10 dark:to-slate-900',
        tone === 'ink' && 'border-family-primary/20 bg-gradient-to-br from-family-primary/5 to-white dark:from-slate-800 dark:to-slate-950',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-stone-500 dark:text-slate-400">{label}</p>
        {icon ? (
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-family-primary/8 text-family-primary dark:bg-family-accent/15 dark:text-family-accent">
            {icon}
          </span>
        ) : null}
      </div>
      <p className="font-serif mt-4 text-3xl font-semibold tracking-tight text-family-ink dark:text-family-accent">{value}</p>
      {hint ? <p className="mt-2 text-xs leading-relaxed text-stone-500 dark:text-slate-400">{hint}</p> : null}
    </article>
  );
}
