'use client';

import { useLocale } from 'next-intl';
import { useEffect } from 'react';

/** Keeps `<html lang>` and `dir` in sync when the `[locale]` segment changes. */
export function HtmlLocaleAttrs() {
  const locale = useLocale();

  useEffect(() => {
    const root = document.documentElement;
    root.lang = locale;
    root.dir = locale === 'ar' || locale === 'he' ? 'rtl' : 'ltr';
  }, [locale]);

  return null;
}
