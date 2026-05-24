import localeCountryCodes from '../data/locale-country-codes.json';

const GLOBAL_FLAG = '🌐';

/** UI picker variants and other non-ISO codes → flag country. */
const LOCALE_FLAG_COUNTRIES: Partial<Record<string, string[]>> = {
  'en-gb': ['GB'],
  'en-us': ['US'],
};

/** ISO 3166-1 alpha-2 → regional indicator flag emoji. */
export function countryCodeToFlagEmoji(countryCode: string): string {
  const code = countryCode.trim().toUpperCase();
  if (code.length !== 2 || !/^[A-Z]{2}$/.test(code)) return GLOBAL_FLAG;
  if (code === 'UN' || code === 'EU') return GLOBAL_FLAG;
  return String.fromCodePoint(...[...code].map((char) => 0x1f1e6 - 65 + char.charCodeAt(0)));
}

/** ISO 3166-1 codes for flag images (one or more per UI locale). */
export function localeToCountryCodes(locale: string): string[] {
  const full = locale.trim().toLowerCase();

  // Full key first (en-us / en-gb), not base "en" → GB from geonames map.
  const variant = LOCALE_FLAG_COUNTRIES[full];
  if (variant?.length) {
    return variant.filter((cc) => cc !== 'UN' && cc !== 'EU');
  }

  const base = full.split('-')[0];
  const country = (localeCountryCodes as Record<string, string>)[base];
  if (!country || country === 'UN' || country === 'EU') return [];
  return [country];
}

export function localeToCountryCode(locale: string): string | null {
  const codes = localeToCountryCodes(locale);
  return codes[0] ?? null;
}

export function localeToFlagEmoji(locale: string): string {
  const country = localeToCountryCode(locale);
  return country ? countryCodeToFlagEmoji(country) : GLOBAL_FLAG;
}
