'use client';

import { useState } from 'react';
import { localeToCountryCodes } from '@family/shared';
import { cn } from '@/lib/utils';

function GlobeIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className={cn('h-[15px] w-5 shrink-0 text-stone-400 dark:text-slate-500', className)}
    >
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <ellipse cx="12" cy="12" rx="4" ry="9" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M3 12h18" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function flagImageUrl(countryCode: string, size: 24 | 48 = 24): string {
  const cc = countryCode.toLowerCase();
  return size === 48
    ? `https://flagcdn.com/48x36/${cc}.png`
    : `https://flagcdn.com/24x18/${cc}.png`;
}

function FlagImage({ countryCode, className }: { countryCode: string; className?: string }) {
  const [broken, setBroken] = useState(false);

  if (broken) {
    return <GlobeIcon className={className} />;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- PNG flags (emoji flags show as "GB" on Windows)
    <img
      src={flagImageUrl(countryCode, 24)}
      srcSet={`${flagImageUrl(countryCode, 48)} 2x`}
      width={24}
      height={18}
      alt=""
      aria-hidden
      loading="lazy"
      decoding="async"
      onError={() => setBroken(true)}
      className={cn(
        'h-[15px] w-5 shrink-0 rounded-[2px] object-cover shadow-sm ring-1 ring-black/10 dark:ring-white/10',
        className,
      )}
    />
  );
}

/** Flag image for a UI locale (en-gb → GB, en-us → US). Uses PNG, not emoji. */
export function LocaleFlag({ locale, className }: { locale: string; className?: string }) {
  const countries = localeToCountryCodes(locale);

  if (countries.length === 0) {
    return <GlobeIcon className={className} />;
  }

  if (countries.length === 1) {
    return <FlagImage countryCode={countries[0]!} className={className} />;
  }

  return (
    <span className={cn('inline-flex shrink-0 items-center gap-0.5', className)} aria-hidden>
      {countries.map((countryCode) => (
        <FlagImage key={countryCode} countryCode={countryCode} />
      ))}
    </span>
  );
}
