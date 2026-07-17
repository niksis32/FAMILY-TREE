'use client';

import { AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export function AdminModerationPendingBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-400 text-amber-950 shadow-sm ring-2 ring-amber-200/80 animate-pulse',
        className,
      )}
      title="!"
      aria-hidden
    >
      <AlertCircle className="h-3.5 w-3.5" strokeWidth={2.5} />
    </span>
  );
}
