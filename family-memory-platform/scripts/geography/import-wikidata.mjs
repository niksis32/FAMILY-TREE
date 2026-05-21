/**
 * Wikidata import from local JSON (no live API calls by default).
 *
 * Input: data/imports/wikidata/places.json
 * Format: [{ "wikidataId": "Q656", "name": "...", "iso2": "RU", "latitude": 59.93, "longitude": 30.31, "aliases": [{ "oldName": "...", "fromYear": 1703, "toYear": 1914 }] }]
 */
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { loadRootEnv } from './lib/load-env.mjs';
import { createPrismaClient } from './lib/prisma-client.mjs';

loadRootEnv();
const prisma = createPrismaClient();
const inputPath = join(process.cwd(), 'data/imports/wikidata/places.json');

async function main() {
  if (!existsSync(inputPath)) {
    console.error(`Missing ${inputPath}`);
    console.error('Export Wikidata entities to JSON and re-run.');
    process.exitCode = 1;
    return;
  }

  const rows = JSON.parse(readFileSync(inputPath, 'utf8'));
  let cities = 0;
  let aliases = 0;

  for (const row of rows) {
    const country = row.iso2
      ? await prisma.country.findFirst({ where: { iso2: row.iso2 } })
      : null;

    if (!country) continue;

    const city = await prisma.city.upsert({
      where: { id: row.id ?? `geo-wikidata-${row.wikidataId}` },
      update: {
        name: row.name,
        historicalName: row.historicalName ?? null,
        latitude: row.latitude ?? null,
        longitude: row.longitude ?? null,
        wikidataId: row.wikidataId,
        countryId: country.id,
      },
      create: {
        id: row.id ?? `geo-wikidata-${row.wikidataId}`,
        countryId: country.id,
        name: row.name,
        historicalName: row.historicalName ?? null,
        latitude: row.latitude ?? null,
        longitude: row.longitude ?? null,
        wikidataId: row.wikidataId,
        periodFrom: row.periodFrom ?? null,
        periodTo: row.periodTo ?? null,
      },
    });
    cities += 1;

    for (const alias of row.aliases ?? []) {
      await prisma.historicalPlaceAlias.upsert({
        where: { id: alias.id ?? `geo-wikidata-alias-${city.id}-${alias.oldName}` },
        update: alias,
        create: {
          id: alias.id ?? `geo-wikidata-alias-${city.id}-${alias.oldName}`,
          cityId: city.id,
          oldName: alias.oldName,
          fromYear: alias.fromYear ?? null,
          toYear: alias.toYear ?? null,
        },
      });
      aliases += 1;
    }
  }

  console.log(`Wikidata import done. cities=${cities}, aliases=${aliases}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
