import { existsSync } from 'node:fs';
import { join } from 'node:path';

const CITIES15000_URL = 'https://download.geonames.org/export/dump/cities15000.zip';
const DUMP_URL = 'https://download.geonames.org/export/dump/';

/**
 * @param {{ world?: boolean, countryFilter?: string, fileArg?: string }} opts
 * @returns {{ path: string | null, error?: string }}
 */
export function resolveCitiesFilePath(opts) {
  const { world, countryFilter, fileArg } = opts;
  if (fileArg) return { path: fileArg };

  const citiesDir = join(process.cwd(), 'cities');
  const importRoot = join(process.cwd(), 'data/imports/geonames');

  if (world) {
    for (const path of [join(citiesDir, 'cities15000.txt'), join(importRoot, 'cities15000.txt')]) {
      if (existsSync(path)) return { path };
    }
    return {
      path: null,
      error:
        `World import requires cities/cities15000.txt (not RU.txt).\n` +
        `  Download: ${CITIES15000_URL}\n` +
        `  Unzip to: ${join(citiesDir, 'cities15000.txt')}\n` +
        `  For one country only: download XX.zip → cities/XX.txt and run with --country=XX`,
    };
  }

  if (countryFilter) {
    const iso = countryFilter.toUpperCase();
    const perCountry = join(citiesDir, `${iso}.txt`);
    if (existsSync(perCountry)) return { path: perCountry };

    if (iso === 'RU') {
      const ruLocalized = join(citiesDir, 'ru/RU.ru.txt');
      if (existsSync(ruLocalized)) return { path: ruLocalized };
      const ru = join(citiesDir, 'RU.txt');
      if (existsSync(ru)) return { path: ru };
    }

    return {
      path: null,
      error:
        `Cities file not found for ${iso}: cities/${iso}.txt\n` +
        `  Download: ${DUMP_URL}${iso}.zip`,
    };
  }

  const ruCandidates = [
    join(citiesDir, 'ru/RU.ru.txt'),
    join(citiesDir, 'RU.txt'),
    join(citiesDir, 'cities15000.txt'),
    join(importRoot, 'cities15000.txt'),
  ];
  for (const path of ruCandidates) {
    if (existsSync(path)) return { path };
  }

  return {
    path: null,
    error: `No cities file found. Put RU.txt or cities15000.txt under cities/ (see ${DUMP_URL})`,
  };
}
