/** UI + geography API locales (ISO 639-1 from GeoNames alternateNamesV2). */
import geonamesLocales from '../data/geonames-locales.json';

export const APP_LOCALES = geonamesLocales.codes as readonly string[];

export type AppLocale = (typeof APP_LOCALES)[number];

export const DEFAULT_APP_LOCALE: AppLocale = 'en';

export const APP_LOCALE_PRIORITY = geonamesLocales.priority as readonly string[];

/** Locales with full next-intl UI messages (apps/web/i18n/locales/*.json). */
export const UI_MESSAGE_LOCALES = geonamesLocales.uiTranslated as readonly string[];

export const APP_LOCALE_LABELS: Record<string, string> = geonamesLocales.labels;

/** GeoNames `isolanguage` codes — same set as APP_LOCALES. */
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

export function isUiMessageLocale(value: string): boolean {
  return (UI_MESSAGE_LOCALES as readonly string[]).includes(value);
}
