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
import { loadRootEnv } from './lib/load-env.mjs';
import { createPrismaClient } from './lib/prisma-client.mjs';

loadRootEnv();
const prisma = createPrismaClient();
const root = join(process.cwd(), 'data/imports/geonames');

function parseArgs() {
  const args = process.argv.slice(2);
  const fileArg = args.find((a) => a.startsWith('--file='))?.split('=')[1];
  const countryFilter = args.find((a) => a.startsWith('--country='))?.split('=')[1]?.toUpperCase();
  const minPopArg = args.find((a) => a.startsWith('--min-population='))?.split('=')[1];
  const ruLocalized = join(process.cwd(), 'cities/ru/RU.ru.txt');
  const citiesDir = join(process.cwd(), 'cities/RU.txt');
  const defaultFile = existsSync(ruLocalized)
    ? ruLocalized
    : existsSync(citiesDir)
      ? citiesDir
      : join(root, 'cities15000.txt');
  return {
    file: fileArg ?? defaultFile,
    countryFilter: countryFilter ?? (existsSync(citiesDir) ? 'RU' : undefined),
    minPopulation: minPopArg ? Number.parseInt(minPopArg, 10) : 0,
  };
}

/** @param {string} filePath */
function loadAdmin1Names(filePath) {
  const map = new Map();
  if (!existsSync(filePath)) {
    console.warn(`admin1CodesASCII.txt not found (${filePath}). Regions will use codes.`);
    return map;
  }

  for (const line of readFileSync(filePath, 'utf8').split('\n')) {
    if (!line || line.startsWith('#')) continue;
    const parts = line.split('\t');
    const key = parts[0]?.trim();
    const name = parts[1]?.trim();
    if (key && name) map.set(key, name);
  }

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

  return { geonamesId, name, countryCode, admin1Code, population, latitude, longitude, timezone };
}

async function resolveCountryIdForImport(iso2, cache) {
  if (cache.has(iso2)) return cache.get(iso2);

  const related = await prisma.country.findMany({ where: { iso2 }, orderBy: { periodFrom: 'asc' } });
  const preferred =
    related.find((c) => c.id === 'geo-country-ru-empire') ??
    related.find((c) => c.name.toLowerCase().includes('империя')) ??
    related[0];

  if (preferred) {
    cache.set(iso2, preferred.id);
    return preferred.id;
  }

  const created = await prisma.country.create({
    data: {
      id: `geo-geonames-country-${iso2.toLowerCase()}`,
      name: iso2,
      iso2,
      iso3: iso2,
      periodFrom: null,
      periodTo: null,
    },
  });
  cache.set(iso2, created.id);
  return created.id;
}

async function ensureRegion(countryId, iso2, admin1Code, admin1Names, cache) {
  if (!admin1Code) return null;

  const mapKey = `${iso2}.${admin1Code}`;
  if (cache.has(mapKey)) return cache.get(mapKey);

  const regionId = `geo-geonames-region-${iso2.toLowerCase()}-${admin1Code}`;
  const regionName = admin1Names.get(mapKey) ?? `Регион ${admin1Code}`;

  await prisma.region.upsert({
    where: { id: regionId },
    update: { name: regionName, countryId },
    create: {
      id: regionId,
      name: regionName,
      countryId,
      periodFrom: null,
      periodTo: null,
    },
  });

  cache.set(mapKey, regionId);
  return regionId;
}

async function importCities(filePath, countryFilter, minPopulation, admin1Names) {
  if (!existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    process.exitCode = 1;
    return;
  }

  const countryCache = new Map();
  const regionCache = new Map();
  let imported = 0;
  let skipped = 0;

  const stream = createReadStream(filePath, { encoding: 'utf8' });
  const rl = createInterface({ input: stream, crlfDelay: true });

  for await (const line of rl) {
    if (!line || line.startsWith('#')) continue;
    const row = parseGeonamesCityLine(line);
    if (!row) continue;
    if (countryFilter && row.countryCode !== countryFilter) continue;
    if (minPopulation > 0 && row.population < minPopulation) continue;

    const countryId = await resolveCountryIdForImport(row.countryCode, countryCache);
    const regionId = await ensureRegion(
      countryId,
      row.countryCode,
      row.admin1Code,
      admin1Names,
      regionCache,
    );
    const yearNow = new Date().getFullYear();

    try {
      await prisma.city.upsert({
        where: { geonamesId: row.geonamesId },
        update: {
          name: row.name,
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
          name: row.name,
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
  const { file, countryFilter, minPopulation } = parseArgs();
  const admin1Path = existsSync(join(process.cwd(), 'cities/ru/admin1CodesASCII.ru.txt'))
    ? join(process.cwd(), 'cities/ru/admin1CodesASCII.ru.txt')
    : join(process.cwd(), 'cities/admin1CodesASCII.txt');
  const admin1Names = loadAdmin1Names(admin1Path);
  await importCities(file, countryFilter, minPopulation, admin1Names);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
