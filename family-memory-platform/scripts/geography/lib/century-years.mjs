/** @param {string} centuryParam */
export function centuryToYearRange(centuryParam) {
  const raw = String(centuryParam ?? '').trim();
  if (!raw) return null;

  const romanMap = { XVIII: 18, XIX: 19, XX: 20, XXI: 21 };
  let century = romanMap[raw.toUpperCase()];
  if (!century) {
    const parsed = Number.parseInt(raw, 10);
    if (!Number.isFinite(parsed) || parsed < 1) return null;
    century = parsed;
  }

  return { from: (century - 1) * 100 + 1, to: century * 100 };
}

/** @param {number | null | undefined} periodFrom @param {number | null | undefined} periodTo @param {number} yearFrom @param {number} yearTo */
export function periodsOverlap(periodFrom, periodTo, yearFrom, yearTo) {
  const start = periodFrom ?? Number.MIN_SAFE_INTEGER;
  const end = periodTo ?? 9999;
  return start <= yearTo && end >= yearFrom;
}
