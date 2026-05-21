/**
 * Pick Country.id for GeoNames import (regions/cities) so data is visible
 * for all historical rows with the same iso2 (Congress Poland + geonames PL, etc.).
 */
export async function resolveCountryIdForIso2(prisma, iso2, cache) {
  if (cache?.has(iso2)) return cache.get(iso2);

  const related = await prisma.country.findMany({
    where: { iso2 },
    orderBy: [{ periodFrom: 'asc' }, { name: 'asc' }],
  });

  const geonamesId = `geo-geonames-country-${iso2.toLowerCase()}`;
  const preferred =
    related.find((c) => c.id === geonamesId) ??
    related.find((c) => c.id.startsWith('geo-geonames-country-')) ??
    related.find((c) => c.periodFrom == null && c.periodTo == null) ??
    related[0] ??
    null;

  if (preferred) {
    cache?.set(iso2, preferred.id);
    return preferred.id;
  }

  const created = await prisma.country.create({
    data: {
      id: geonamesId,
      name: iso2,
      iso2,
      iso3: iso2,
      periodFrom: null,
      periodTo: null,
    },
  });
  cache?.set(iso2, created.id);
  return created.id;
}

/** @returns {Promise<Set<string>>} */
export async function loadIso2SetFromDb(prisma) {
  const rows = await prisma.country.findMany({
    where: { iso2: { not: null } },
    select: { iso2: true },
  });
  return new Set(rows.map((r) => r.iso2).filter(Boolean));
}
