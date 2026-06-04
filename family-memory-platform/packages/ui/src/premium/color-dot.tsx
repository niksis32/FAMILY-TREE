import { cn } from '../lib/cn';

export function ColorDot({
  color,
  className,
}: {
  color: string;
  className?: string;
}) {
  return (
    <span
      className={cn('inline-block shrink-0 rounded-full', className)}
      style={{ backgroundColor: color }}
      aria-hidden
    />
  );
}
