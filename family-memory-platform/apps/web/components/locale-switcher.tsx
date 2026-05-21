'use client';

import { useLocale, useTranslations } from 'next-intl';
import { usePathname, useRouter } from '@/i18n/navigation';
import { APP_LOCALE_LABELS, APP_LOCALES, type AppLocale } from '@/i18n/config';

export function LocaleSwitcher() {
  const locale = useLocale() as AppLocale;
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations('common');

  return (
    <label className="flex items-center gap-2 text-sm text-stone-600">
      <span className="sr-only">{t('language')}</span>
      <span aria-hidden>{t('language')}</span>
      <select
        className="rounded border border-stone-300 bg-white px-2 py-1 text-sm dark:border-slate-600 dark:bg-slate-900"
        value={locale}
        onChange={(event) => {
          const next = event.target.value as AppLocale;
          router.replace(pathname, { locale: next });
        }}
      >
        {APP_LOCALES.map((code) => (
          <option key={code} value={code}>
            {APP_LOCALE_LABELS[code]}
          </option>
        ))}
      </select>
    </label>
  );
}
