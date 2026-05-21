/** UI + geography API locales (ISO 639-1, aligned with GeoNames alternateNamesV2). */
export const APP_LOCALES = ['en', 'de', 'fr', 'es', 'ru'] as const;

export type AppLocale = (typeof APP_LOCALES)[number];

export const DEFAULT_APP_LOCALE: AppLocale = 'en';

export const APP_LOCALE_LABELS: Record<AppLocale, string> = {
  en: 'English',
  de: 'Deutsch',
  fr: 'Français',
  es: 'Español',
  ru: 'Русский',
};

/** GeoNames `isolanguage` codes we import from alternateNamesV2. */
export const GEOGRAPHY_NAME_LOCALES = APP_LOCALES;

export function normalizeAppLocale(input?: string | null): AppLocale {
  if (!input?.trim()) return DEFAULT_APP_LOCALE;
  const base = input.trim().split('-')[0].toLowerCase();
  if ((APP_LOCALES as readonly string[]).includes(base)) return base as AppLocale;
  return DEFAULT_APP_LOCALE;
}

export function isAppLocale(value: string): value is AppLocale {
  return (APP_LOCALES as readonly string[]).includes(value);
}
