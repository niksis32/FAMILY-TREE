/**
 * Backfill Region.geonamesId + admin1Key from cities/admin1CodesASCII.txt
 * (for regions created before geonamesId column existed).
 *
 * Usage: pnpm geography:backfill:regions
 */
import { loadAdmin1Meta, regionIdFromAdmin1Key } from './lib/load-admin1-meta.mjs';
import { loadRootEnv } from './lib/load-env.mjs';
import { createPrismaClient } from './lib/prisma-client.mjs';

loadRootEnv();
const prisma = createPrismaClient();

async function main() {
  const meta = loadAdmin1Meta();
  console.log(`admin1 entries: ${meta.size}`);

  let updated = 0;
  let missing = 0;

  for (const [admin1Key, { name, geonamesId }] of meta) {
    const regionId = regionIdFromAdmin1Key(admin1Key);
    if (!regionId) continue;

    const existing = await prisma.region.findUnique({ where: { id: regionId } });
    if (!existing) {
      missing += 1;
      continue;
    }

    await prisma.region.update({
      where: { id: regionId },
      data: {
        geonamesId,
        admin1Key,
        name: existing.name || name,
      },
    });
    updated += 1;
  }

  console.log(`Regions updated: ${updated}, not in DB (skipped): ${missing}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
