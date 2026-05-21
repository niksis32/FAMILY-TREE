/**
 * Import all admin1 regions for a country (default RU) from admin1CodesASCII.txt.
 * Ensures full region list even when city import used --min-population filter.
 *
 * Usage:
 *   pnpm geography:import:regions-admin1
 *   node scripts/geography/import-regions-admin1.mjs --country=RU
 */
import { loadAdmin1Meta, parseAdmin1Key, regionIdFromAdmin1Key } from './lib/load-admin1-meta.mjs';
import { loadRootEnv } from './lib/load-env.mjs';
import { createPrismaClient } from './lib/prisma-client.mjs';

loadRootEnv();
const prisma = createPrismaClient();

function parseArgs() {
  const country = process.argv.find((a) => a.startsWith('--country='))?.split('=')[1]?.toUpperCase() ?? 'RU';
  return { country };
}

async function resolveCountryId(iso2) {
  const rows = await prisma.country.findMany({ where: { iso2 }, orderBy: { periodFrom: 'asc' } });
  return (
    rows.find((c) => c.id === 'geo-country-ru') ??
    rows.find((c) => c.id.startsWith('geo-geonames-country-')) ??
    rows.find((c) => c.id === 'geo-country-ru-empire') ??
    rows[0] ??
    null
  );
}

async function main() {
  const { country: countryIso2 } = parseArgs();
  const countryId = await resolveCountryId(countryIso2);
  if (!countryId) {
    console.error(`No Country with iso2=${countryIso2}. Run geography:import:countries or geography:seed first.`);
    process.exit(1);
  }

  console.log(`Target country: ${countryId} (iso2=${countryIso2})`);

  const meta = loadAdmin1Meta();
  let imported = 0;
  let skipped = 0;

  for (const [admin1Key, { name, geonamesId }] of meta) {
    const parsed = parseAdmin1Key(admin1Key);
    if (!parsed || parsed.iso2 !== countryIso2) continue;

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

  console.log(`admin1 regions import done. imported=${imported}, skipped=${skipped}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
