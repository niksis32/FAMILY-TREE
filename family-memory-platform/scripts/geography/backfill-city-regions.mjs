/**
 * Re-link City.regionId from GeoNames admin1 (cities15000.txt or XX.txt).
 * Run after regions-admin1 import if city dropdown is empty for a known region.
 *
 *   pnpm geography:import:cities:backfill-regions          # needs cities15000.txt
 *   pnpm geography:import:cities:backfill-regions:ru       # only RU.txt present
 *   node scripts/geography/backfill-city-regions.mjs --country=DE
 */
import { createReadStream, existsSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { regionIdFromAdmin1Key } from './lib/load-admin1-meta.mjs';
import { loadRootEnv } from './lib/load-env.mjs';
import { createPrismaClient } from './lib/prisma-client.mjs';
import { resolveCitiesFilePath } from './lib/resolve-cities-file.mjs';

loadRootEnv();
const prisma = createPrismaClient();

function parseArgs() {
  const world = process.argv.includes('--world');
  const country = process.argv.find((a) => a.startsWith('--country='))?.split('=')[1]?.toUpperCase();
  const fileArg = process.argv.find((a) => a.startsWith('--file='))?.split('=').slice(1).join('=');

  const resolved = resolveCitiesFilePath({
    world,
    countryFilter: world ? undefined : country,
    fileArg,
  });

  return { file: resolved.path, fileError: resolved.error, countryFilter: world ? null : country };
}

function parseLine(line) {
  const parts = line.split('\t');
  if (parts.length < 11) return null;
  const geonamesId = Number.parseInt(parts[0], 10);
  const countryCode = parts[8]?.trim();
  const admin1Code = parts[10]?.trim() || '';
  if (!Number.isFinite(geonamesId) || !countryCode) return null;
  return { geonamesId, countryCode, admin1Code };
}

async function main() {
  const { file, fileError, countryFilter } = parseArgs();
  if (fileError || !file || !existsSync(file)) {
    console.error(fileError ?? `File not found: ${file}`);
    process.exitCode = 1;
    return;
  }

  console.log(`Backfill cities file: ${file}`);
  if (countryFilter) console.log(`Country filter: ${countryFilter}`);

  let updated = 0;
  let skipped = 0;
  const stream = createReadStream(file, { encoding: 'utf8' });
  const rl = createInterface({ input: stream, crlfDelay: true });

  for await (const line of rl) {
    if (!line || line.startsWith('#')) continue;
    const row = parseLine(line);
    if (!row) continue;
    if (countryFilter && row.countryCode !== countryFilter) continue;
    if (!row.admin1Code) {
      skipped += 1;
      continue;
    }

    const admin1Key = `${row.countryCode}.${row.admin1Code}`;
    const regionId = regionIdFromAdmin1Key(admin1Key);
    if (!regionId) {
      skipped += 1;
      continue;
    }

    const result = await prisma.city.updateMany({
      where: { geonamesId: row.geonamesId },
      data: { regionId },
    });
    if (result.count > 0) updated += result.count;
    if (updated > 0 && updated % 5000 === 0) console.log(`Updated ${updated} cities...`);
  }

  console.log(`Backfill done. updated=${updated}, skipped_no_admin1_or_region=${skipped}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
