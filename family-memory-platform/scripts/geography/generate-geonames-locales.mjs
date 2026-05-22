/**
 * Build packages/shared/src/data/geonames-locales.json from GeoNames iso-languagecodes.txt
 *
 *   pnpm geography:generate:locales
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const src = join(root, 'cities/alternateNamesV2/iso-languagecodes.txt');
const out = join(root, 'packages/shared/src/data/geonames-locales.json');

const PRIORITY = [
  'en', 'ru', 'de', 'fr', 'es', 'uk', 'pl', 'it', 'pt', 'nl', 'sv', 'no', 'da', 'fi', 'cs', 'sk',
  'hu', 'ro', 'bg', 'el', 'tr', 'ar', 'he', 'zh', 'ja', 'ko', 'hi', 'bn', 'vi', 'th', 'id', 'ms',
  'ca', 'hr', 'sr', 'sl', 'lt', 'lv', 'et', 'ka', 'hy', 'az', 'kk', 'uz',
];

/** Filled from apps/web/i18n/locales/*.json if present */
function loadUiTranslatedFromWeb() {
  const localesDir = join(root, 'apps/web/i18n/locales');
  if (!existsSync(localesDir)) return ['en', 'de', 'fr', 'es', 'ru'];
  return readdirSync(localesDir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => f.replace(/\.json$/, ''))
    .sort((a, b) => (a === 'en' ? -1 : b === 'en' ? 1 : a.localeCompare(b)));
}

function main() {
  const labels = {};
  for (const line of readFileSync(src, 'utf8').split('\n').slice(1)) {
    const parts = line.split('\t');
    const iso1 = (parts[2] ?? '').trim().toLowerCase();
    const name = (parts[3] ?? '').trim();
    if (iso1.length === 2 && /^[a-z]{2}$/.test(iso1) && name) labels[iso1] = name;
  }

  const sorted = Object.keys(labels).sort((a, b) => labels[a].localeCompare(labels[b], 'en'));
  const codes = [...new Set([...PRIORITY.filter((c) => labels[c]), ...sorted])];

  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(
    out,
    `${JSON.stringify(
      {
        codes,
        labels,
        priority: PRIORITY.filter((c) => labels[c]),
        uiTranslated: loadUiTranslatedFromWeb(),
        source: 'cities/alternateNamesV2/iso-languagecodes.txt',
      },
      null,
      2,
    )}\n`,
    'utf8',
  );

  console.log(`Wrote ${out} (${codes.length} ISO 639-1 locales)`);
}

main();
