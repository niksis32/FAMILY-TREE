import type { AppLocale } from '@family/shared';

export {
  APP_LOCALES,
  APP_LOCALE_LABELS,
  APP_LOCALE_PRIORITY,
  DEFAULT_APP_LOCALE,
  UI_MESSAGE_LOCALES,
  normalizeAppLocale,
  type AppLocale,
} from '@family/shared';

/** BCP-47 for Intl (sorting, dates). */
export function intlLocale(locale: AppLocale): string {
  const known: Partial<Record<string, string>> = {
    en: 'en-US',
    de: 'de-DE',
    fr: 'fr-FR',
    es: 'es-ES',
    ru: 'ru-RU',
    uk: 'uk-UA',
    pl: 'pl-PL',
    it: 'it-IT',
    pt: 'pt-PT',
    nl: 'nl-NL',
    zh: 'zh-CN',
    ja: 'ja-JP',
    ko: 'ko-KR',
    ar: 'ar-SA',
    he: 'he-IL',
    tr: 'tr-TR',
    el: 'el-GR',
    cs: 'cs-CZ',
    sk: 'sk-SK',
    hu: 'hu-HU',
    ro: 'ro-RO',
    bg: 'bg-BG',
    sv: 'sv-SE',
    no: 'nb-NO',
    da: 'da-DK',
    fi: 'fi-FI',
  };
  if (known[locale]) return known[locale]!;
  try {
    const canonical = Intl.getCanonicalLocales(locale);
    return canonical[0] ?? locale;
  } catch {
    return 'en-US';
  }
}
