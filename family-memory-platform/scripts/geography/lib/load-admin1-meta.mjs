import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * GeoNames admin1CodesASCII: code, name, ascii name, geonameId
 * @param {string} [filePath]
 */
export function loadAdmin1Meta(filePath) {
  const defaultPath = existsSync(join(process.cwd(), 'cities/ru/admin1CodesASCII.ru.txt'))
    ? join(process.cwd(), 'cities/ru/admin1CodesASCII.ru.txt')
    : join(process.cwd(), 'cities/admin1CodesASCII.txt');

  const path = filePath ?? defaultPath;
  /** @type {Map<string, { name: string, geonamesId: number }>} */
  const map = new Map();

  if (!existsSync(path)) {
    console.warn(`admin1CodesASCII not found: ${path}`);
    return map;
  }

  for (const line of readFileSync(path, 'utf8').split('\n')) {
    if (!line || line.startsWith('#')) continue;
    const parts = line.split('\t');
    const key = parts[0]?.trim();
    const name = parts[1]?.trim();
    const geonamesId = Number.parseInt(parts[3], 10);
    if (!key || !name || !Number.isFinite(geonamesId)) continue;
    map.set(key, { name, geonamesId });
  }

  return map;
}

/** @param {string} admin1Key e.g. RU.48 */
export function parseAdmin1Key(admin1Key) {
  const dot = admin1Key.indexOf('.');
  if (dot < 1) return null;
  return {
    iso2: admin1Key.slice(0, dot).toUpperCase(),
    admin1Code: admin1Key.slice(dot + 1),
  };
}

/** Stable Region.id used by import-geonames.mjs */
export function regionIdFromAdmin1Key(admin1Key) {
  const parsed = parseAdmin1Key(admin1Key);
  if (!parsed) return null;
  return `geo-geonames-region-${parsed.iso2.toLowerCase()}-${parsed.admin1Code}`;
}
