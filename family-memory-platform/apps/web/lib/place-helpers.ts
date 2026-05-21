import type { PlaceRecord } from '@/lib/api-client';

export const CENTURY_OPTIONS = [
  { value: '', label: 'Век не указан' },
  { value: 'XVIII', label: 'XVIII век (1701–1800)' },
  { value: 'XIX', label: 'XIX век (1801–1900)' },
  { value: 'XX', label: 'XX век (1901–2000)' },
  { value: 'XXI', label: 'XXI век (2001–2100)' },
] as const;

export const DEFAULT_COUNTRIES = [
  'Россия',
  'Казахстан',
  'Украина',
  'Беларусь',
  'Германия',
  'Польша',
  'США',
  'Израиль',
] as const;

/** Убирает суффикс «(XIX век)» для сравнения стран. */
export function baseCountryName(country?: string | null) {
  if (!country) return '';
  return country.replace(/\s*\([^(]*век\)\s*$/iu, '').trim();
}

export function formatCountryWithCentury(country: string, century: string) {
  const base = country.trim();
  if (!base) return '';
  if (!century) return base;
  return `${base} (${century} век)`;
}

export function countryPeriodLabel(country: string, century: string) {
  if (!country) return '';
  if (!century) return country;
  return `${country} (${century} век)`;
}

export function buildCountryOptions(places: PlaceRecord[]) {
  const set = new Set<string>(DEFAULT_COUNTRIES);
  for (const place of places) {
    const base = baseCountryName(place.country);
    if (base) set.add(base);
  }
  return [...set].sort((a, b) => a.localeCompare(b, 'ru'));
}

export function buildCountryPeriodOptions(places: PlaceRecord[], century: string) {
  const countries = buildCountryOptions(places);
  const fromPlaces = new Set<string>();

  for (const place of places) {
    const base = baseCountryName(place.country);
    if (!base) continue;
    const placeCentury = extractCenturyFromCountry(place.country);
    if (century && placeCentury && placeCentury !== century) continue;
    fromPlaces.add(countryPeriodLabel(base, placeCentury || century));
  }

  for (const country of countries) {
    if (century) {
      fromPlaces.add(countryPeriodLabel(country, century));
    } else {
      fromPlaces.add(country);
    }
  }

  return [...fromPlaces].filter(Boolean).sort((a, b) => a.localeCompare(b, 'ru'));
}

function extractCenturyFromCountry(country?: string | null) {
  if (!country) return '';
  const match = country.match(/\(([IVX]+)\s*век\)/iu);
  return match?.[1] ?? '';
}

export function citiesForCountry(places: PlaceRecord[], countryPeriod: string) {
  const base = baseCountryName(countryPeriod);
  const century = extractCenturyFromCountry(countryPeriod);

  const cities = new Set<string>();
  for (const place of places) {
    if (!place.city) continue;
    if (baseCountryName(place.country) !== base) continue;
    if (century) {
      const placeCentury = extractCenturyFromCountry(place.country);
      if (placeCentury && placeCentury !== century) continue;
    }
    cities.add(place.city);
  }
  return [...cities].sort((a, b) => a.localeCompare(b, 'ru'));
}

export function formatPlaceOption(place: PlaceRecord) {
  const parts = [place.name, place.country, place.city].filter(Boolean);
  return parts.join(' · ');
}
