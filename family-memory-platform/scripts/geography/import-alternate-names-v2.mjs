/**
 * Import GeoNames alternateNamesV2 into GeographicName (en, de, fr, es, ru).
 *
 * Source: cities/alternateNamesV2/alternateNamesV2.txt
 * Format (tab): alternateNameId, geonameId, isolanguage, alternate name, isPreferred, ...
 *
 * Only rows whose geonameId exists in Country/City tables are imported (fast path).
 *
 * Usage (WSL, from repo root):
 *   pnpm geography:import:i18n
 *   pnpm geography:import:i18n -- --locale=ru
 *   pnpm geography:import:i18n -- --entity=city --locale=en,de
 *   pnpm geography:import:i18n -- --dry-run
 */
import { createReadStream, existsSync } from 'node:fs';
import { join } from 'node:path';
import { createInterface } from 'node:readline';
import { parseLocaleList } from './lib/geo-locales.mjs';
import { loadRootEnv } from './lib/load-env.mjs';
import { createPrismaClient } from './lib/prisma-client.mjs';

loadRootEnv();
const prisma = createPrismaClient();

const DEFAULT_FILE = join(process.cwd(), 'cities/alternateNamesV2/alternateNamesV2.txt');
const BATCH_SIZE = 1500;
const LOG_EVERY = 500_000;

function parseArgs() {
  const args = process.argv.slice(2);
  const file = args.find((a) => a.startsWith('--file='))?.split('=')[1] ?? DEFAULT_FILE;
  const localeArg = args.find((a) => a.startsWith('--locale='))?.split('=')[1];
  const entityArg = args.find((a) => a.startsWith('--entity='))?.split('=')[1]?.toLowerCase();
  const dryRun = args.includes('--dry-run');
  const locales = parseLocaleList(localeArg);
  const localeSet = new Set(locales);
  const entities =
    entityArg === 'country'
      ? ['country']
      : entityArg === 'city'
        ? ['city']
        : entityArg === 'region'
          ? ['region']
          : ['country', 'region', 'city'];
  return { file, locales, localeSet, entities, dryRun };
}

/** @param {import('@prisma/client').PrismaClient} client */
async function loadGeonameMaps(client, entities) {
  /** @type {Map<number, { entityType: 'COUNTRY' | 'CITY', entityId: string }>} */
  const map = new Map();

  if (entities.includes('country')) {
    const countries = await client.country.findMany({
      where: { geonamesId: { not: null } },
      select: { id: true, geonamesId: true },
    });
    for (const row of countries) {
      if (row.geonamesId != null) map.set(row.geonamesId, { entityType: 'COUNTRY', entityId: row.id });
    }
    console.log(`Countries with geonamesId: ${countries.length}`);
  }

  if (entities.includes('region')) {
    const regions = await client.region.findMany({
      where: { geonamesId: { not: null } },
      select: { id: true, geonamesId: true },
    });
    for (const row of regions) {
      if (row.geonamesId != null) map.set(row.geonamesId, { entityType: 'REGION', entityId: row.id });
    }
    console.log(`Regions with geonamesId: ${regions.length}`);
  }

  if (entities.includes('city')) {
    const cities = await client.city.findMany({
      where: { geonamesId: { not: null } },
      select: { id: true, geonamesId: true },
    });
    for (const row of cities) {
      if (row.geonamesId != null) map.set(row.geonamesId, { entityType: 'CITY', entityId: row.id });
    }
    console.log(`Cities with geonamesId: ${cities.length}`);
  }

  return map;
}

/**
 * @param {Map<string, { entityType: string, entityId: string, locale: string, name: string, isPreferred: boolean }>} pending
 */
async function flushPending(pending, dryRun, stats) {
  if (!pending.size) return;
  const rows = [...pending.values()];
  pending.clear();

  if (dryRun) {
    stats.upserted += rows.length;
    return;
  }

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const chunk = rows.slice(i, i + BATCH_SIZE);
    await prisma.$transaction(
      chunk.map((row) =>
        prisma.geographicName.upsert({
          where: {
            entityType_entityId_locale: {
              entityType: row.entityType,
              entityId: row.entityId,
              locale: row.locale,
            },
          },
          create: {
            entityType: row.entityType,
            entityId: row.entityId,
            locale: row.locale,
            name: row.name,
            isPreferred: row.isPreferred,
          },
          update: {
            name: row.name,
            isPreferred: row.isPreferred,
          },
        }),
      ),
    );
    stats.upserted += chunk.length;
  }
}

/**
 * @param {string} line
 * @param {Set<string>} localeSet
 */
function parseAlternateLine(line, localeSet) {
  if (!line) return null;
  const parts = line.split('\t');
  if (parts.length < 4) return null;

  const geonamesId = Number.parseInt(parts[1], 10);
  const isolanguage = parts[2]?.trim().toLowerCase();
  const name = parts[3]?.trim();
  const isPreferred = parts[4] === '1';

  if (!Number.isFinite(geonamesId) || !name) return null;
  if (!isolanguage || !localeSet.has(isolanguage)) return null;

  return { geonamesId, locale: isolanguage, name, isPreferred };
}

async function main() {
  const { file, localeSet, entities, dryRun } = parseArgs();

  if (!existsSync(file)) {
    console.error(`File not found: ${file}`);
    process.exit(1);
  }

  console.log(`File: ${file}`);
  console.log(`Locales: ${[...localeSet].join(', ')}`);
  console.log(`Entities: ${entities.join(', ')}`);
  if (dryRun) console.log('DRY RUN — no DB writes');

  const geonameMap = await loadGeonameMaps(prisma, entities);
  if (!geonameMap.size) {
    console.error('No Country/City rows with geonamesId. Run geography:import:ru-cities first.');
    process.exit(1);
  }

  const stats = { lines: 0, matched: 0, upserted: 0, skipped: 0 };
  /** @type {Map<string, { entityType: string, entityId: string, locale: string, name: string, isPreferred: boolean }>} */
  const pending = new Map();

  const stream = createReadStream(file, { encoding: 'utf8' });
  const rl = createInterface({ input: stream, crlfDelay: true });

  for await (const line of rl) {
    stats.lines += 1;
    if (stats.lines % LOG_EVERY === 0) {
      console.log(
        `… ${stats.lines.toLocaleString()} lines | matched ${stats.matched} | upserted ${stats.upserted}`,
      );
      await flushPending(pending, dryRun, stats);
    }

    const parsed = parseAlternateLine(line, localeSet);
    if (!parsed) continue;

    const target = geonameMap.get(parsed.geonamesId);
    if (!target) continue;

    stats.matched += 1;
    const key = `${target.entityType}:${target.entityId}:${parsed.locale}`;
    const existing = pending.get(key);

    if (!existing || parsed.isPreferred || (!existing.isPreferred && parsed.name.length > existing.name.length)) {
      pending.set(key, {
        entityType: target.entityType,
        entityId: target.entityId,
        locale: parsed.locale,
        name: parsed.name,
        isPreferred: parsed.isPreferred,
      });
    }

    if (pending.size >= BATCH_SIZE) {
      await flushPending(pending, dryRun, stats);
    }
  }

  await flushPending(pending, dryRun, stats);

  console.log('Done.');
  console.log(JSON.stringify(stats, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
