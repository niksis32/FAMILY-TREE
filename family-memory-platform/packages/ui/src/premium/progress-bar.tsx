import { cn } from '../lib/cn';

export function ProgressBar({
  value,
  className,
  trackClassName,
  fillClassName,
  size = 'md',
}: {
  value: number;
  className?: string;
  trackClassName?: string;
  fillClassName?: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  const clamped = Math.min(100, Math.max(0, value));

  return (
    <div
      className={cn(
        'overflow-hidden rounded-full bg-stone-200 dark:bg-slate-800',
        size === 'sm' ? 'h-1' : size === 'lg' ? 'h-3' : 'h-1.5',
        trackClassName,
        className,
      )}
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={cn(
          'h-full rounded-full bg-family-accent transition-all duration-500',
          fillClassName,
        )}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
