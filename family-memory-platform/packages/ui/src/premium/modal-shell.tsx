'use client';

import type { ReactNode } from 'react';
import { useEffect, useId, useRef } from 'react';
import { cn } from '../lib/cn';
import { useFocusTrap } from '../lib/use-focus-trap';

export function ModalShell({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  size = 'lg',
  className,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'md' | 'lg' | 'xl';
  className?: string;
}) {
  const titleId = useId();
  const subtitleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  useFocusTrap(panelRef, open);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  const maxW =
    size === 'md' ? 'max-w-lg' : size === 'xl' ? 'max-w-6xl' : 'max-w-3xl';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-family-ink/50 backdrop-blur-md"
        aria-label="Close dialog"
        onClick={onClose}
      />
      <div
        ref={panelRef}
        tabIndex={-1}
        className={cn(
          'relative z-10 max-h-[92vh] w-full overflow-hidden rounded-[1.75rem] border border-family-accent/15 bg-white shadow-2xl outline-none dark:bg-slate-950',
          maxW,
          className,
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={subtitle ? subtitleId : undefined}
      >
        <div className="border-b border-stone-200/80 bg-gradient-to-r from-family-surface to-white px-6 py-5 dark:border-slate-800 dark:from-slate-900 dark:to-slate-950">
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.28em] text-family-accent">Workspace</p>
          <h2 id={titleId} className="font-serif mt-1 text-2xl font-semibold text-family-ink dark:text-white">
            {title}
          </h2>
          {subtitle ? (
            <p id={subtitleId} className="mt-1 text-sm text-stone-500 dark:text-slate-400">
              {subtitle}
            </p>
          ) : null}
        </div>
        <div className="overflow-y-auto px-6 py-5">{children}</div>
        {footer ? (
          <div className="border-t border-stone-200/80 bg-stone-50/80 px-6 py-4 dark:border-slate-800 dark:bg-slate-900/50">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}
