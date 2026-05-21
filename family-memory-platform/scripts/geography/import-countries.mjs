/**
 * GeoNames countries from local countryInfo.txt (no network).
 * Download: https://download.geonames.org/export/dump/countryInfo.txt
 * Place at: cities/countryInfo.txt
 *
 * Usage: pnpm geography:import:countries
 */
import { createReadStream, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createInterface } from 'node:readline';
import { loadRootEnv } from './lib/load-env.mjs';
import { createPrismaClient } from './lib/prisma-client.mjs';

loadRootEnv();
const prisma = createPrismaClient();

function parseArgs() {
  const fileArg = process.argv.slice(2).find((a) => a.startsWith('--file='))?.split('=')[1];
  const ruPath = join(process.cwd(), 'cities/ru/countryInfo.ru.txt');
  const enPath = join(process.cwd(), 'cities/countryInfo.txt');
  return fileArg ?? (existsSync(ruPath) ? ruPath : enPath);
}

function parseCountryLine(line) {
  if (!line || line.startsWith('#')) return null;
  const parts = line.split('\t');
  if (parts.length < 5) return null;
  const iso2 = parts[0]?.trim();
  if (!iso2 || iso2.length !== 2) return null;
  return {
    iso2,
    iso3: parts[1]?.trim() || null,
    name: parts[4]?.trim() || iso2,
    geonamesId: Number.parseInt(parts[16] ?? '', 10) || null,
  };
}

async function upsertCountryRow(row) {
  const existing = await prisma.country.findMany({ where: { iso2: row.iso2 } });

  if (existing.length > 0) {
    for (const country of existing) {
      const data = {
        iso3: row.iso3 ?? country.iso3,
      };

      if (row.geonamesId) {
        const conflict = await prisma.country.findFirst({
          where: { geonamesId: row.geonamesId, NOT: { id: country.id } },
        });
        if (!conflict && !country.geonamesId) {
          data.geonamesId = row.geonamesId;
        }
      }

      await prisma.country.update({ where: { id: country.id }, data });
    }
    return 'updated';
  }

  const createData = {
    id: `geo-geonames-country-${row.iso2.toLowerCase()}`,
    name: row.name,
    iso2: row.iso2,
    iso3: row.iso3,
    geonamesId: row.geonamesId,
    periodFrom: null,
    periodTo: null,
  };

  if (row.geonamesId) {
    const conflict = await prisma.country.findFirst({ where: { geonamesId: row.geonamesId } });
    if (conflict) delete createData.geonamesId;
  }

  await prisma.country.create({ data: createData });
  return 'created';
}

async function main() {
  const filePath = parseArgs();
  if (!existsSync(filePath)) {
    console.error(`Missing ${filePath}`);
    console.error('Положите countryInfo.txt в cities/countryInfo.txt');
    process.exitCode = 1;
    return;
  }

  let updated = 0;
  let created = 0;
  const rl = createInterface({ input: createReadStream(filePath, { encoding: 'utf8' }), crlfDelay: true });

  for await (const line of rl) {
    const row = parseCountryLine(line);
    if (!row) continue;
    const result = await upsertCountryRow(row);
    if (result === 'created') created += 1;
    else updated += 1;
  }

  console.log(`Countries import done. updated=${updated}, created=${created}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
