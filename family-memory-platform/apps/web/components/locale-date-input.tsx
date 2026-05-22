'use client';

import { useTranslations } from 'next-intl';
import { Input } from '@/components/ui';
import type { InputHTMLAttributes } from 'react';

/**
 * ISO date (YYYY-MM-DD) input with placeholder from UI locale — avoids
 * Russian «дд.мм.гггг» ghost text from native type="date" on RU OS locale.
 */
export function LocaleDateInput({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  const tForm = useTranslations('formHints');

  return (
    <div className="space-y-1">
      <Input
        type="text"
        inputMode="numeric"
        autoComplete="off"
        placeholder={tForm('datePlaceholder')}
        pattern="[0-9]{4}-[0-9]{2}-[0-9]{2}"
        className={className}
        title={tForm('dateFormat')}
        {...props}
      />
      <p className="text-xs text-stone-500 dark:text-slate-400">{tForm('dateFormat')}</p>
    </div>
  );
}
