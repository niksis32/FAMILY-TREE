import type { PlaceRecord } from '@/lib/api-client';

/** Roman century label → API query param (19, 20, …). */
export function centuryToApiParam(century: string): string | undefined {
  if (!century.trim()) return undefined;
  const map: Record<string, string> = {
    XVIII: '18',
    XIX: '19',
    XX: '20',
    XXI: '21',
  };
  return map[century.trim().toUpperCase()] ?? century.trim();
}

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

/** Города по умолчанию, если в БД ещё нет мест с city для страны. */
export const DEFAULT_CITIES_BY_COUNTRY: Record<string, string[]> = {
  Россия: ['Москва', 'Санкт-Петербург', 'Казань', 'Новосибирск', 'Екатеринбург', 'Самара', 'Уфа'],
  Казахстан: ['Алматы', 'Астана', 'Шымкент', 'Караганда'],
  Украина: ['Киев', 'Харьков', 'Одесса', 'Львов', 'Днепр'],
  Беларусь: ['Минск', 'Гомель', 'Брест', 'Витебск'],
  Германия: ['Берлин', 'Мюнхен', 'Гамбург', 'Кёльн'],
  Польша: ['Варшава', 'Краков', 'Гданьск', 'Вроцлав'],
  США: ['Нью-Йорк', 'Лос-Анджелес', 'Чикаго', 'Хьюстон'],
  Израиль: ['Тель-Авив', 'Иерусалим', 'Хайфа', 'Беэр-Шева'],
};

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
  if (!base) return [];

  const century = extractCenturyFromCountry(countryPeriod);
  const cities = new Set<string>();

  for (const place of places) {
    if (!place.city?.trim()) continue;
    if (baseCountryName(place.country) !== base) continue;

    const placeCentury = extractCenturyFromCountry(place.country);
    if (placeCentury && century && placeCentury !== century) continue;

    cities.add(place.city.trim());
  }

  for (const city of DEFAULT_CITIES_BY_COUNTRY[base] ?? []) {
    cities.add(city);
  }

  return [...cities].sort((a, b) => a.localeCompare(b, 'ru'));
}

export function formatPlaceOption(place: PlaceRecord) {
  const country = place.geoCountry?.name ?? place.country;
  const region = place.geoRegion?.name ?? place.region;
  const city = place.geoCity?.name ?? place.city;
  const parts = [place.name, country, region, city].filter(Boolean);
  return parts.join(' · ');
}
