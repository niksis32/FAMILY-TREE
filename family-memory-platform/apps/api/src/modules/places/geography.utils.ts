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
