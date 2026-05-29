import type { ComponentType, ReactNode } from 'react';
import { cn } from '../lib/cn';

export interface QuickActionLinkProps {
  href: string;
  className?: string;
  children: ReactNode;
}

export function QuickActionCard({
  href,
  title,
  description,
  icon,
  className,
  LinkComponent,
}: {
  href: string;
  title: string;
  description: string;
  icon: ReactNode;
  className?: string;
  LinkComponent: ComponentType<QuickActionLinkProps>;
}) {
  return (
    <LinkComponent
      href={href}
      className={cn(
        'group flex flex-col rounded-[1.35rem] border bg-white/90 p-5 shadow-premium transition duration-300 hover:-translate-y-1 hover:border-family-accent/40 hover:shadow-lg dark:bg-slate-900/85 dark:hover:border-family-accent/30',
        className,
      )}
    >
      <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-family-primary text-white shadow-lg shadow-family-primary/20 transition group-hover:bg-family-accent group-hover:text-family-ink dark:bg-family-accent dark:text-family-ink">
        {icon}
      </span>
      <h3 className="font-serif mt-4 text-lg font-semibold text-family-ink dark:text-white">{title}</h3>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-stone-600 dark:text-slate-400">{description}</p>
      <span className="mt-4 text-xs font-semibold uppercase tracking-wider text-family-accent">→</span>
    </LinkComponent>
  );
}
