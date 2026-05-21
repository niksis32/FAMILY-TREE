/**
 * Seed GeographicName for historical countries (no geonamesId or extra labels).
 * Data: apps/api/prisma/data/geography-country-i18n.json
 *
 * Usage: pnpm geography:import:country-i18n
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { GEOGRAPHY_NAME_LOCALES } from './lib/geo-locales.mjs';
import { loadRootEnv } from './lib/load-env.mjs';
import { createPrismaClient } from './lib/prisma-client.mjs';

loadRootEnv();
const prisma = createPrismaClient();

const dataPath = join(process.cwd(), 'apps/api/prisma/data/geography-country-i18n.json');

async function main() {
  const data = JSON.parse(readFileSync(dataPath, 'utf8'));
  let upserted = 0;

  for (const [countryId, locales] of Object.entries(data)) {
    for (const locale of GEOGRAPHY_NAME_LOCALES) {
      const entry = locales[locale];
      if (!entry?.name) continue;

      await prisma.geographicName.upsert({
        where: {
          entityType_entityId_locale: {
            entityType: 'COUNTRY',
            entityId: countryId,
            locale,
          },
        },
        create: {
          entityType: 'COUNTRY',
          entityId: countryId,
          locale,
          name: entry.name,
          isPreferred: true,
        },
        update: { name: entry.name, isPreferred: true },
      });
      upserted += 1;

      if (entry.historical) {
        const histId = `${countryId}#historical`;
        await prisma.geographicName.upsert({
          where: {
            entityType_entityId_locale: {
              entityType: 'COUNTRY',
              entityId: histId,
              locale,
            },
          },
          create: {
            entityType: 'COUNTRY',
            entityId: histId,
            locale,
            name: entry.historical,
            isPreferred: true,
          },
          update: { name: entry.historical, isPreferred: true },
        });
        upserted += 1;
      }
    }
  }

  console.log(`Country display i18n upserted: ${upserted}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
