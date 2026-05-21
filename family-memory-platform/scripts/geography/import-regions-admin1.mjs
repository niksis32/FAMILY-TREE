/**
 * Import admin1 regions from admin1CodesASCII.txt.
 *
 * Usage:
 *   pnpm geography:import:regions-admin1          # RU only
 *   pnpm geography:import:regions-admin1:all      # every iso2 present in Country table
 *   node scripts/geography/import-regions-admin1.mjs --country=PL
 */
import { loadAdmin1Meta, parseAdmin1Key, regionIdFromAdmin1Key } from './lib/load-admin1-meta.mjs';
import { loadRootEnv } from './lib/load-env.mjs';
import { createPrismaClient } from './lib/prisma-client.mjs';
import { loadIso2SetFromDb, resolveCountryIdForIso2 } from './lib/resolve-country-id.mjs';

loadRootEnv();
const prisma = createPrismaClient();

function parseArgs() {
  const all = process.argv.includes('--all');
  const country = process.argv.find((a) => a.startsWith('--country='))?.split('=')[1]?.toUpperCase();
  return { all, countryIso2: all ? null : (country ?? 'RU') };
}

async function importIso2(iso2, meta, countryCache) {
  const countryId = await resolveCountryIdForIso2(prisma, iso2, countryCache);
  if (!countryId) {
    console.warn(`Skip iso2=${iso2}: no Country row`);
    return { imported: 0, skipped: 0 };
  }

  let imported = 0;
  let skipped = 0;

  for (const [admin1Key, { name, geonamesId }] of meta) {
    const parsed = parseAdmin1Key(admin1Key);
    if (!parsed || parsed.iso2 !== iso2) continue;

    const regionId = regionIdFromAdmin1Key(admin1Key);
    if (!regionId) {
      skipped += 1;
      continue;
    }

    await prisma.region.upsert({
      where: { id: regionId },
      update: {
        name,
        countryId,
        admin1Key,
        geonamesId,
      },
      create: {
        id: regionId,
        name,
        countryId,
        admin1Key,
        geonamesId,
        periodFrom: null,
        periodTo: null,
      },
    });
    imported += 1;
  }

  return { imported, skipped };
}

async function main() {
  const { all, countryIso2 } = parseArgs();
  const meta = loadAdmin1Meta();
  const countryCache = new Map();

  if (all) {
    const iso2Set = await loadIso2SetFromDb(prisma);
    console.log(`Import admin1 for ${iso2Set.size} iso2 codes from Country table`);
    let total = 0;
    for (const iso2 of [...iso2Set].sort()) {
      const { imported } = await importIso2(iso2, meta, countryCache);
      if (imported > 0) console.log(`  ${iso2}: ${imported} regions`);
      total += imported;
    }
    console.log(`admin1 ALL done. total regions upserted: ${total}`);
    return;
  }

  console.log(`Import admin1 for iso2=${countryIso2}`);
  const { imported, skipped } = await importIso2(countryIso2, meta, countryCache);
  console.log(`admin1 import done. imported=${imported}, skipped=${skipped}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
