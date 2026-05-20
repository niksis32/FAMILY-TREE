import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export function Button({
  className,
  variant = 'primary',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' }) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-family-accent/60 disabled:cursor-not-allowed disabled:opacity-60',
        variant === 'primary' &&
          'bg-family-primary text-white shadow-lg shadow-family-primary/20 hover:-translate-y-0.5 hover:bg-slate-800 dark:bg-family-accent dark:text-slate-950 dark:hover:bg-amber-300',
        variant === 'secondary' &&
          'border bg-white text-family-primary hover:-translate-y-0.5 hover:bg-stone-50 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800',
        variant === 'ghost' && 'text-stone-600 hover:bg-stone-100 dark:text-slate-300 dark:hover:bg-slate-900',
        className,
      )}
      {...props}
    />
  );
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <section
      className={cn(
        'rounded-3xl border bg-white/85 p-6 shadow-premium backdrop-blur transition-all duration-200 hover:-translate-y-0.5 dark:bg-slate-900/80',
        className,
      )}
    >
      {children}
    </section>
  );
}

export function FormField({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn('grid gap-1.5', className)}>
      <span className="text-xs font-semibold tracking-wide text-stone-600 dark:text-slate-400">{label}</span>
      {children}
    </div>
  );
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'w-full rounded-xl border bg-white px-4 py-3 text-sm outline-none transition focus:border-family-accent focus:ring-4 focus:ring-family-accent/15 dark:bg-slate-950',
        className,
      )}
      {...props}
    />
  );
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        'min-h-28 w-full rounded-xl border bg-white px-4 py-3 text-sm outline-none transition focus:border-family-accent focus:ring-4 focus:ring-family-accent/15 dark:bg-slate-950',
        className,
      )}
      {...props}
    />
  );
}

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        'w-full rounded-xl border bg-white px-4 py-3 text-sm outline-none transition focus:border-family-accent focus:ring-4 focus:ring-family-accent/15 dark:bg-slate-950',
        className,
      )}
      {...props}
    />
  );
}

export function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'gold' | 'green' | 'blue' | 'red' }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold',
        tone === 'neutral' && 'bg-stone-100 text-stone-700 dark:bg-slate-800 dark:text-slate-200',
        tone === 'gold' && 'border-family-accent/30 bg-family-accent/15 text-amber-800 dark:text-amber-200',
        tone === 'green' && 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-200',
        tone === 'blue' && 'border-blue-300 bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-200',
        tone === 'red' && 'border-rose-300 bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-200',
      )}
    >
      {children}
    </span>
  );
}

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-family-accent">Family Memory</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-family-ink dark:text-white md:text-4xl">
          {title}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-600 dark:text-slate-300">{description}</p>
      </div>
      {action}
    </div>
  );
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <Card className="border-dashed text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-family-accent/15 text-family-primary dark:text-family-accent">
        +
      </div>
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-stone-600 dark:text-slate-300">{description}</p>
    </Card>
  );
}

export function StatCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <Card className="p-5">
      <p className="text-sm text-stone-500 dark:text-slate-400">{label}</p>
      <p className="mt-3 text-3xl font-semibold text-family-primary dark:text-family-accent">{value}</p>
      <p className="mt-2 text-xs text-stone-500 dark:text-slate-400">{hint}</p>
    </Card>
  );
}
