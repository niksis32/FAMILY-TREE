/** Converts century query (19, XIX, XXI) to inclusive year range. */
export function centuryToYearRange(centuryParam: string): { from: number; to: number } | null {
  const raw = centuryParam.trim();
  if (!raw) return null;

  const romanMap: Record<string, number> = {
    XVIII: 18,
    XIX: 19,
    XX: 20,
    XXI: 21,
  };

  let century = romanMap[raw.toUpperCase()];
  if (!century) {
    const parsed = Number.parseInt(raw, 10);
    if (!Number.isFinite(parsed) || parsed < 1) return null;
    century = parsed;
  }

  return { from: (century - 1) * 100 + 1, to: century * 100 };
}

export function periodOverlapFilter(yearFrom: number, yearTo: number) {
  return {
    AND: [
      { OR: [{ periodFrom: null }, { periodFrom: { lte: yearTo } }] },
      { OR: [{ periodTo: null }, { periodTo: { gte: yearFrom } }] },
    ],
  };
}

/** Империя / СССР / РФ / GeoNames-RU — одна географическая зона для списков регионов и городов. */
export const RU_GEO_ZONE_ISO2 = ['RU', 'SU'] as const;

export function isRuGeoZone(iso2: string | null | undefined): boolean {
  return iso2 != null && (RU_GEO_ZONE_ISO2 as readonly string[]).includes(iso2);
}

/** Cities in a region: exact regionId or any row with the same GeoNames admin1Key (DE.04, RU.48, …). */
export function cityRegionWhereInput(
  region: { id: string; admin1Key: string | null } | null,
  regionId: string,
): { regionId: string } | { OR: Array<{ regionId: string } | { region: { admin1Key: string } }> } {
  if (!region) return { regionId: regionId.trim() };
  if (region.admin1Key) {
    return {
      OR: [{ regionId: region.id }, { region: { admin1Key: region.admin1Key } }],
    };
  }
  return { regionId: region.id };
}
