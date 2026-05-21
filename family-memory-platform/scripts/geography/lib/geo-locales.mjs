/** @typedef {'en' | 'de' | 'fr' | 'es' | 'ru'} AppLocale */

/** @type {readonly AppLocale[]} */
export const GEOGRAPHY_NAME_LOCALES = ['en', 'de', 'fr', 'es', 'ru'];

/** @type {AppLocale} */
export const DEFAULT_GEO_LOCALE = 'en';

/** @param {string | undefined} raw */
export function parseLocaleList(raw) {
  if (!raw) return [...GEOGRAPHY_NAME_LOCALES];
  const parts = raw.split(',').map((s) => s.trim().toLowerCase());
  const filtered = parts.filter((l) => GEOGRAPHY_NAME_LOCALES.includes(/** @type {AppLocale} */ (l)));
  return filtered.length ? filtered : [...GEOGRAPHY_NAME_LOCALES];
}
