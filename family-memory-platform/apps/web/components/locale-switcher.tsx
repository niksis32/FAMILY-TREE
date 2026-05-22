'use client';

import { useLocale, useTranslations } from 'next-intl';
import { usePathname, useRouter } from '@/i18n/navigation';
import { APP_LOCALE_LABELS, APP_LOCALE_PRIORITY, APP_LOCALES, type AppLocale } from '@/i18n/config';

const popularSet = new Set(APP_LOCALE_PRIORITY);
const popularLocales = APP_LOCALE_PRIORITY.filter((code) =>
  (APP_LOCALES as readonly string[]).includes(code),
);
const otherLocales = (APP_LOCALES as readonly string[]).filter((code) => !popularSet.has(code));

function localeLabel(code: string, tLocale: ReturnType<typeof useTranslations<'localeNames'>>) {
  if (tLocale.has(code as 'en')) {
    return tLocale(code as 'en');
  }
  return APP_LOCALE_LABELS[code] ?? code;
}

export function LocaleSwitcher() {
  const locale = useLocale() as AppLocale;
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations('common');
  const tLocale = useTranslations('localeNames');
  const tGroups = useTranslations('localeGroups');

  return (
    <label className="flex items-center gap-2 text-sm text-stone-600 dark:text-slate-300">
      <span className="sr-only">{t('language')}</span>
      <span aria-hidden>{t('language')}</span>
      <select
        className="max-w-[14rem] rounded border border-stone-300 bg-white px-2 py-1 text-sm dark:border-slate-600 dark:bg-slate-900"
        value={locale}
        onChange={(event) => {
          const next = event.target.value as AppLocale;
          router.replace(pathname, { locale: next });
        }}
      >
        <optgroup label={tGroups('popular')}>
          {popularLocales.map((code) => (
            <option key={code} value={code}>
              {localeLabel(code, tLocale)}
            </option>
          ))}
        </optgroup>
        <optgroup label={tGroups('all')}>
          {otherLocales.map((code) => (
            <option key={code} value={code}>
              {localeLabel(code, tLocale)}
            </option>
          ))}
        </optgroup>
      </select>
    </label>
  );
}
