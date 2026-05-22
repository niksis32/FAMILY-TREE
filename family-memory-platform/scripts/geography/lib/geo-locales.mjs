import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dataPath = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../../packages/shared/src/data/geonames-locales.json',
);

/** @type {{ codes: string[], priority: string[], uiTranslated: string[] }} */
const data = JSON.parse(readFileSync(dataPath, 'utf8'));

/** @type {readonly string[]} */
export const GEOGRAPHY_NAME_LOCALES = data.codes;

/** @type {string} */
export const DEFAULT_GEO_LOCALE = 'en';

/** Default import set (fast); use --locale=all for all ISO 639-1 from iso-languagecodes.txt */
const DEFAULT_IMPORT_LOCALES = [...new Set([...data.priority, ...data.uiTranslated])];

/** @param {string | undefined} raw */
export function parseLocaleList(raw) {
  if (!raw) return DEFAULT_IMPORT_LOCALES;
  if (raw.trim().toLowerCase() === 'all') return [...GEOGRAPHY_NAME_LOCALES];
  const parts = raw.split(',').map((s) => s.trim().toLowerCase());
  const set = new Set(GEOGRAPHY_NAME_LOCALES);
  const filtered = parts.filter((l) => set.has(l));
  return filtered.length ? filtered : DEFAULT_IMPORT_LOCALES;
}
