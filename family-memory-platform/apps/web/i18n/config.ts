import type { AppLocale } from '@family/shared';

export {
  APP_LOCALES,
  APP_LOCALE_LABELS,
  DEFAULT_APP_LOCALE,
  normalizeAppLocale,
  type AppLocale,
} from '@family/shared';

/** BCP-47 for Intl (sorting, dates). */
export function intlLocale(locale: AppLocale): string {
  const map: Record<AppLocale, string> = {
    en: 'en-US',
    de: 'de-DE',
    fr: 'fr-FR',
    es: 'es-ES',
    ru: 'ru-RU',
  };
  return map[locale];
}
