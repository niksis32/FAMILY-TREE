import { buildFullName, nameSimilarity, normalizeToken } from './normalize';
import type { MatchReason, MatchScoreResult, PersonMatchSnapshot } from './types';

const MIN_SCORE = 0.35;

function reason(type: MatchReason['type'], weight: number, explanation: string): MatchReason {
  return { type, weight, explanation };
}

function jaccard(a: string[], b: string[]): number {
  if (!a.length || !b.length) return 0;
  const setA = new Set(a.map((x) => normalizeToken(x)).filter(Boolean));
  const setB = new Set(b.map((x) => normalizeToken(x)).filter(Boolean));
  let inter = 0;
  for (const x of setA) {
    if (setB.has(x)) inter += 1;
  }
  const union = new Set([...setA, ...setB]).size;
  return union > 0 ? inter / union : 0;
}

function yearProximity(a?: string | null, b?: string | null, tolerance = 2): number {
  if (!a || !b) return 0;
  const ya = new Date(a).getUTCFullYear();
  const yb = new Date(b).getUTCFullYear();
  if (Number.isNaN(ya) || Number.isNaN(yb)) return 0;
  const diff = Math.abs(ya - yb);
  if (diff <= tolerance) return 1;
  if (diff <= 5) return 0.6;
  if (diff <= 10) return 0.3;
  return 0;
}

function periodOverlap(
  a?: { from?: number | null; to?: number | null },
  b?: { from?: number | null; to?: number | null },
): number {
  if (!a?.from && !a?.to && !b?.from && !b?.to) return 0;
  const aFrom = a?.from ?? a?.to ?? 0;
  const aTo = a?.to ?? a?.from ?? 9999;
  const bFrom = b?.from ?? b?.to ?? 0;
  const bTo = b?.to ?? b?.from ?? 9999;
  const overlap = Math.min(aTo, bTo) - Math.max(aFrom, bFrom);
  if (overlap < 0) return 0;
  const span = Math.max(aTo, bTo) - Math.min(aFrom, bFrom);
  return span > 0 ? Math.min(1, overlap / span) : 0;
}

/** Explainable 12-factor scoring (MVP weights sum to 1.0). */
export function scorePersonMatch(source: PersonMatchSnapshot, target: PersonMatchSnapshot): MatchScoreResult {
  const reasons: MatchReason[] = [];

  const primaryName = nameSimilarity(buildFullName(source), buildFullName(target));
  if (primaryName > 0.4) {
    reasons.push(
      reason('NAME', 0.2 * primaryName, `Name similarity ${Math.round(primaryName * 100)}%`),
    );
  }

  let altBest = 0;
  for (const alias of source.aliases ?? []) {
    altBest = Math.max(altBest, nameSimilarity(buildFullName(alias), buildFullName(target)));
  }
  for (const alias of target.aliases ?? []) {
    altBest = Math.max(altBest, nameSimilarity(buildFullName(source), buildFullName(alias)));
  }
  if (altBest > 0.5) {
    reasons.push(reason('ALT_NAME', 0.06 * altBest, `Alternative name overlap ${Math.round(altBest * 100)}%`));
  }

  const birthProx = yearProximity(source.birthDate, target.birthDate);
  if (birthProx > 0) {
    reasons.push(reason('BIRTH_DATE', 0.08 * birthProx, 'Birth years are close'));
  }

  const deathProx = yearProximity(source.deathDate, target.deathDate);
  if (deathProx > 0) {
    reasons.push(reason('DEATH_DATE', 0.07 * deathProx, 'Death years are close'));
  }

  const placeSim = jaccard(source.places ?? [], target.places ?? []);
  if (placeSim > 0.2) {
    reasons.push(reason('PLACE', 0.12 * placeSim, 'Shared or similar places'));
  }

  const spouseSim = jaccard(source.spouseNames ?? [], target.spouseNames ?? []);
  if (spouseSim > 0.2) {
    reasons.push(reason('SPOUSE', 0.08 * spouseSim, 'Spouse names align'));
  }

  const parentSim = jaccard(source.parentNames ?? [], target.parentNames ?? []);
  if (parentSim > 0.2) {
    reasons.push(reason('PARENT', 0.08 * parentSim, 'Parent names align'));
  }

  const childSim = jaccard(source.childNames ?? [], target.childNames ?? []);
  if (childSim > 0.2) {
    reasons.push(reason('CHILD', 0.08 * childSim, 'Children names align'));
  }

  const familyCtx = (spouseSim + parentSim + childSim) / 3;
  if (familyCtx > 0.15) {
    reasons.push(reason('FAMILY_CONTEXT', 0.15 * familyCtx, 'Family network context matches'));
  }

  const sourceOverlap = jaccard(source.sourceIds ?? [], target.sourceIds ?? []);
  if (sourceOverlap > 0) {
    reasons.push(reason('SOURCE_OVERLAP', 0.08 * sourceOverlap, 'Same genealogical sources cited'));
  }

  const docOverlap = jaccard(source.documentTitles ?? [], target.documentTitles ?? []);
  if (docOverlap > 0.2) {
    reasons.push(reason('DOCUMENT', 0.03 * docOverlap, 'Similar archive documents'));
  }

  if (source.avatarMediaId && target.avatarMediaId && source.avatarMediaId === target.avatarMediaId) {
    reasons.push(reason('PHOTO', 0.02, 'Same avatar media reference'));
  } else if (source.avatarMediaId && target.avatarMediaId) {
    reasons.push(reason('PHOTO', 0.005, 'Both have profile photos (weak signal)'));
  }

  const hist = periodOverlap(source.historicalPeriod, target.historicalPeriod);
  if (hist > 0.3) {
    reasons.push(
      reason('HISTORICAL_PERIOD', 0.05 * hist, 'Overlapping historical period'),
    );
  }

  const score = Math.min(0.99, reasons.reduce((sum, r) => sum + r.weight, 0));

  return {
    score: score >= MIN_SCORE ? score : 0,
    reasons: score >= MIN_SCORE ? reasons : [],
    scoringMethod: 'heuristic',
  };
}
