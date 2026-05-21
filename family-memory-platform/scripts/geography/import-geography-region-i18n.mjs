/**
 * Translations for seed Region rows (governorates, federal districts without geonames-only i18n).
 * Data: apps/api/prisma/data/geography-region-i18n.json
 *
 * Usage: pnpm geography:import:region-i18n
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { GEOGRAPHY_NAME_LOCALES } from './lib/geo-locales.mjs';
import { loadRootEnv } from './lib/load-env.mjs';
import { createPrismaClient } from './lib/prisma-client.mjs';

loadRootEnv();
const prisma = createPrismaClient();

const dataPath = join(process.cwd(), 'apps/api/prisma/data/geography-region-i18n.json');

async function main() {
  const data = JSON.parse(readFileSync(dataPath, 'utf8'));
  let upserted = 0;

  for (const [regionId, locales] of Object.entries(data)) {
    for (const locale of GEOGRAPHY_NAME_LOCALES) {
      const name = locales[locale];
      if (!name) continue;

      await prisma.geographicName.upsert({
        where: {
          entityType_entityId_locale: {
            entityType: 'REGION',
            entityId: regionId,
            locale,
          },
        },
        create: {
          entityType: 'REGION',
          entityId: regionId,
          locale,
          name,
          isPreferred: true,
        },
        update: { name, isPreferred: true },
      });
      upserted += 1;
    }
  }

  console.log(`Region seed i18n upserted: ${upserted}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
