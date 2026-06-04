import type { ReactNode } from 'react';
import { cn } from '../lib/cn';

export function PageHero({
  eyebrow,
  title,
  description,
  action,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-[1.35rem] border border-family-accent/20 bg-gradient-to-br from-white via-family-surface to-stone-100/80 p-5 shadow-premium sm:rounded-[2rem] sm:p-8 dark:border-family-accent/15 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900/90 md:p-10',
        className,
      )}
    >
      <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-family-accent/10 blur-3xl" aria-hidden />
      <div className="relative flex flex-col justify-between gap-6 md:flex-row md:items-end">
        <div className="max-w-3xl">
          {eyebrow ? (
            <p className="font-serif text-xs font-medium uppercase tracking-[0.35em] text-family-accent">{eyebrow}</p>
          ) : null}
          <h1 className="font-serif mt-3 text-2xl font-semibold tracking-tight text-family-ink dark:text-white sm:text-3xl md:text-4xl lg:text-[2.65rem]">
            {title}
          </h1>
          {description ? (
            <p className="mt-4 text-base leading-relaxed text-stone-600 dark:text-slate-300">{description}</p>
          ) : null}
        </div>
        {action ? (
          <div className="flex w-full shrink-0 flex-wrap gap-2 md:w-auto md:justify-end">{action}</div>
        ) : null}
      </div>
    </div>
  );
}
