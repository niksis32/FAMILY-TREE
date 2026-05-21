import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadRootEnv } from './lib/load-env.mjs';
import { createPrismaClient } from './lib/prisma-client.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const seedPath = path.join(__dirname, '../../apps/api/prisma/data/geography-seed.json');

/**
 * Loads local geography reference data into PostgreSQL.
 * @param {import('@prisma/client').PrismaClient} [prisma]
 */
export async function loadGeographySeed(prisma) {
  const client = prisma ?? createPrismaClient();
  const ownsClient = !prisma;
  const payload = JSON.parse(readFileSync(seedPath, 'utf8'));

  for (const country of payload.countries) {
    await client.country.upsert({
      where: { id: country.id },
      update: country,
      create: country,
    });
  }

  for (const region of payload.regions) {
    await client.region.upsert({
      where: { id: region.id },
      update: region,
      create: region,
    });
  }

  for (const city of payload.cities) {
    await upsertCitySafe(client, city);
  }

  for (const alias of payload.aliases) {
    await client.historicalPlaceAlias.upsert({
      where: { id: alias.id },
      update: alias,
      create: alias,
    });
  }

  const counts = {
    countries: payload.countries.length,
    regions: payload.regions.length,
    cities: payload.cities.length,
    aliases: payload.aliases.length,
  };

  if (ownsClient) await client.$disconnect();
  return counts;
}

/** Не дублируем geonamesId (уже занят другим городом, напр. после import RU.txt). */
async function upsertCitySafe(client, city) {
  const data = { ...city };

  if (data.geonamesId != null) {
    const conflict = await client.city.findFirst({
      where: {
        geonamesId: data.geonamesId,
        NOT: { id: data.id },
      },
      select: { id: true },
    });
    if (conflict) delete data.geonamesId;
  }

  await client.city.upsert({
    where: { id: city.id },
    update: data,
    create: data,
  });
}

async function main() {
  loadRootEnv();
  const counts = await loadGeographySeed();
  console.log('Geography seed loaded:', counts);
}

const isDirectRun =
  process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (isDirectRun) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
