/**
 * OpenStreetMap import from local GeoJSON (Nominatim export or Overpass dump).
 *
 * Input: data/imports/osm/places.geojson
 * Properties expected: name, country_code, lat, lon, population, historic
 */
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { loadRootEnv } from './lib/load-env.mjs';
import { createPrismaClient } from './lib/prisma-client.mjs';

loadRootEnv();
const prisma = createPrismaClient();
const inputPath = join(process.cwd(), 'data/imports/osm/places.geojson');

async function main() {
  if (!existsSync(inputPath)) {
    console.error(`Missing ${inputPath}`);
    console.error('Export OSM places to GeoJSON and re-run.');
    process.exitCode = 1;
    return;
  }

  const geojson = JSON.parse(readFileSync(inputPath, 'utf8'));
  const features = geojson.features ?? [];
  let count = 0;

  for (const feature of features) {
    const props = feature.properties ?? {};
    const coords = feature.geometry?.coordinates;
    if (!props.name || !Array.isArray(coords)) continue;

    const iso2 = (props.country_code ?? props['addr:country'] ?? '').toUpperCase();
    const country = iso2 ? await prisma.country.findFirst({ where: { iso2 } }) : null;
    if (!country) continue;

    const osmId = String(props['@id'] ?? props.osm_id ?? props.id ?? `${props.name}-${coords[1]}`);
    const longitude = coords[0];
    const latitude = coords[1];

    await prisma.city.upsert({
      where: { id: `geo-osm-${osmId.replace(/[^a-zA-Z0-9_-]/g, '_')}` },
      update: {
        name: props.name,
        historicalName: props.historic ?? props['name:ru'] ?? null,
        latitude,
        longitude,
        population: props.population ? Number.parseInt(String(props.population), 10) : null,
        countryId: country.id,
      },
      create: {
        id: `geo-osm-${osmId.replace(/[^a-zA-Z0-9_-]/g, '_')}`,
        countryId: country.id,
        name: props.name,
        historicalName: props.historic ?? null,
        latitude,
        longitude,
        population: props.population ? Number.parseInt(String(props.population), 10) : null,
        periodFrom: null,
        periodTo: null,
      },
    });
    count += 1;
  }

  console.log(`OSM import done. cities=${count}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
