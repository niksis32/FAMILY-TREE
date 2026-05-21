/**
 * GeoNames cities import (local RU.txt + optional admin1CodesASCII.txt).
 *
 * cities/RU.txt — https://download.geonames.org/export/dump/RU.zip
 * cities/admin1CodesASCII.txt — https://download.geonames.org/export/dump/admin1CodesASCII.txt
 *
 * Usage:
 *   pnpm geography:import:ru-cities
 */
import { createReadStream, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createInterface } from 'node:readline';
import { resolveRussianPlaceName } from './lib/extract-russian-name.mjs';
import { loadGeonamesRuNamesMap } from './lib/geonames-ru-names-map.mjs';
import { loadAdmin1Meta } from './lib/load-admin1-meta.mjs';
import { loadRootEnv } from './lib/load-env.mjs';
import { createPrismaClient } from './lib/prisma-client.mjs';
import { loadIso2SetFromDb, resolveCountryIdForIso2 } from './lib/resolve-country-id.mjs';

loadRootEnv();
const prisma = createPrismaClient();
const root = join(process.cwd(), 'data/imports/geonames');

function resolveCitiesFilePath(countryFilter, fileArg) {
  if (fileArg) return fileArg;

  const citiesDir = join(process.cwd(), 'cities');
  if (countryFilter) {
    const perCountry = join(citiesDir, `${countryFilter}.txt`);
    if (existsSync(perCountry)) return perCountry;
    if (countryFilter === 'RU') {
      const ruLocalized = join(citiesDir, 'ru/RU.ru.txt');
      if (existsSync(ruLocalized)) return ruLocalized;
      const ru = join(citiesDir, 'RU.txt');
      if (existsSync(ru)) return ru;
    }
  }

  const candidates = [
    join(citiesDir, 'cities15000.txt'),
    join(root, 'cities15000.txt'),
    join(citiesDir, 'RU.txt'),
  ];
  for (const path of candidates) {
    if (existsSync(path)) return path;
  }
  return null;
}

function parseArgs() {
  const args = process.argv.slice(2);
  const fileArg = args.find((a) => a.startsWith('--file='))?.split('=')[1];
  const world = args.includes('--world') || args.includes('--all-countries');
  const countryFilter = args.find((a) => a.startsWith('--country='))?.split('=')[1]?.toUpperCase();
  const minPopArg = args.find((a) => a.startsWith('--min-population='))?.split('=')[1];

  const resolvedCountry = world ? undefined : (countryFilter ?? 'RU');
  const file = resolveCitiesFilePath(resolvedCountry, fileArg);

  return {
    file,
    world,
    countryFilter: resolvedCountry,
    minPopulation: minPopArg ? Number.parseInt(minPopArg, 10) : 0,
  };
}

/** @param {string} filePath */
function loadAdmin1Names(filePath) {
  const meta = loadAdmin1Meta(filePath);
  const map = new Map();
  for (const [key, value] of meta) map.set(key, value.name);
  console.log(`Loaded admin1 names: ${map.size}`);
  return map;
}

/** @param {string} line */
function parseGeonamesCityLine(line) {
  const parts = line.split('\t');
  if (parts.length < 15) return null;

  const featureClass = parts[6];
  if (featureClass !== 'P') return null;

  const geonamesId = Number.parseInt(parts[0], 10);
  const name = parts[1];
  const countryCode = parts[8];
  const admin1Code = parts[10]?.trim() || '';
  const population = Number.parseInt(parts[14], 10) || 0;
  const latitude = Number.parseFloat(parts[4]);
  const longitude = Number.parseFloat(parts[5]);
  const timezone = parts[17] || null;
  const alternatenames = parts[3] || '';

  return { geonamesId, name, alternatenames, countryCode, admin1Code, population, latitude, longitude, timezone };
}

async function ensureRegion(countryId, iso2, admin1Code, admin1Names, admin1Meta, cache) {
  if (!admin1Code) return null;

  const mapKey = `${iso2}.${admin1Code}`;
  if (cache.has(mapKey)) return cache.get(mapKey);

  const regionId = `geo-geonames-region-${iso2.toLowerCase()}-${admin1Code}`;
  const meta = admin1Meta.get(mapKey);
  const regionName = admin1Names.get(mapKey) ?? meta?.name ?? `Region ${admin1Code}`;
  const geonamesId = meta?.geonamesId ?? null;

  await prisma.region.upsert({
    where: { id: regionId },
    update: {
      name: regionName,
      countryId,
      admin1Key: mapKey,
      ...(geonamesId != null ? { geonamesId } : {}),
    },
    create: {
      id: regionId,
      name: regionName,
      countryId,
      admin1Key: mapKey,
      geonamesId,
      periodFrom: null,
      periodTo: null,
    },
  });

  cache.set(mapKey, regionId);
  return regionId;
}

async function importCities(filePath, countryFilter, allowedIso2, minPopulation, admin1Names, admin1Meta, ruNamesMap) {
  if (!filePath || !existsSync(filePath)) {
    console.error(`Cities file not found.`);
    console.error(`  For one country: download https://download.geonames.org/export/dump/XX.zip → cities/XX.txt`);
    console.error(`  For all countries: download cities15000.zip → cities/cities15000.txt`);
    console.error(`  Then: pnpm geography:import:cities -- --country=PL`);
    console.error(`       pnpm geography:import:cities:world`);
    process.exitCode = 1;
    return;
  }

  const countryCache = new Map();
  const regionCache = new Map();
  let imported = 0;
  let skipped = 0;

  console.log(`Cities file: ${filePath}`);
  if (countryFilter) console.log(`Country filter: ${countryFilter}`);
  else if (allowedIso2) console.log(`World import, iso2 in DB: ${allowedIso2.size}`);

  const stream = createReadStream(filePath, { encoding: 'utf8' });
  const rl = createInterface({ input: stream, crlfDelay: true });

  for await (const line of rl) {
    if (!line || line.startsWith('#')) continue;
    const row = parseGeonamesCityLine(line);
    if (!row) continue;
    if (countryFilter && row.countryCode !== countryFilter) continue;
    if (allowedIso2 && !allowedIso2.has(row.countryCode)) continue;
    if (minPopulation > 0 && row.population < minPopulation) continue;

    const countryId = await resolveCountryIdForIso2(prisma, row.countryCode, countryCache);
    if (!countryId) {
      skipped += 1;
      continue;
    }
    const regionId = await ensureRegion(
      countryId,
      row.countryCode,
      row.admin1Code,
      admin1Names,
      admin1Meta,
      regionCache,
    );
    const yearNow = new Date().getFullYear();

    const displayName =
      row.countryCode === 'RU'
        ? resolveRussianPlaceName(row.name, row.alternatenames, row.geonamesId, ruNamesMap)
        : row.name;

    try {
      await prisma.city.upsert({
        where: { geonamesId: row.geonamesId },
        update: {
          name: displayName,
          latitude: row.latitude,
          longitude: row.longitude,
          population: row.population || null,
          timezone: row.timezone,
          countryId,
          regionId,
        },
        create: {
          id: `geo-geonames-city-${row.geonamesId}`,
          countryId,
          regionId,
          name: displayName,
          latitude: row.latitude,
          longitude: row.longitude,
          population: row.population || null,
          timezone: row.timezone,
          geonamesId: row.geonamesId,
          periodFrom: 1500,
          periodTo: yearNow,
        },
      });
      imported += 1;
      if (imported % 1000 === 0) console.log(`Imported ${imported} cities...`);
    } catch {
      skipped += 1;
    }
  }

  console.log(`GeoNames import done. imported=${imported}, skipped=${skipped}, regions=${regionCache.size}`);
}

async function main() {
  const { file, world, countryFilter, minPopulation } = parseArgs();
  const admin1Path = existsSync(join(process.cwd(), 'cities/ru/admin1CodesASCII.ru.txt'))
    ? join(process.cwd(), 'cities/ru/admin1CodesASCII.ru.txt')
    : join(process.cwd(), 'cities/admin1CodesASCII.txt');
  const admin1Meta = loadAdmin1Meta(admin1Path);
  const admin1Names = loadAdmin1Names(admin1Path);
  const ruNamesMap = countryFilter === 'RU' || world ? await loadGeonamesRuNamesMap() : new Map();
  const allowedIso2 = world ? await loadIso2SetFromDb(prisma) : null;
  await importCities(file, countryFilter, allowedIso2, minPopulation, admin1Names, admin1Meta, ruNamesMap);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
