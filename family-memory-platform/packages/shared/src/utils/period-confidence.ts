import type { PeriodConfidenceLevel, PeriodConfidenceResult } from '../types/photo-intelligence';

export interface PeriodConfidenceInput {
  photoYear?: number | null;
  birthDate?: string | Date | null;
  deathDate?: string | Date | null;
  isLiving?: boolean;
  toleranceYears?: number;
}

function yearFromDate(value?: string | Date | null): number | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.getUTCFullYear();
}

/** Rule-based plausibility: was this person alive around the photo year? */
export function computePeriodConfidence(input: PeriodConfidenceInput): PeriodConfidenceResult {
  const photoYear = input.photoYear ?? null;
  const birthYear = yearFromDate(input.birthDate);
  const deathYear = input.isLiving === false ? yearFromDate(input.deathDate) : yearFromDate(input.deathDate);
  const tolerance = input.toleranceYears ?? 2;
  const reasons: string[] = [];

  if (photoYear == null) {
    return { level: 'unknown', score: 0, photoYear: null, reasons: ['no_photo_year'] };
  }

  if (birthYear == null && deathYear == null) {
    return {
      level: 'unknown',
      score: 0.25,
      photoYear,
      reasons: ['person_dates_unknown'],
    };
  }

  if (birthYear != null && photoYear < birthYear - tolerance) {
    reasons.push('born_after_photo');
    return { level: 'low', score: 0.1, photoYear, reasons };
  }

  if (deathYear != null && photoYear > deathYear + tolerance) {
    reasons.push('died_before_photo');
    return { level: 'low', score: 0.15, photoYear, reasons };
  }

  if (birthYear != null && photoYear < birthYear) {
    reasons.push('born_slightly_after_photo');
    return { level: 'medium', score: 0.45, photoYear, reasons };
  }

  if (deathYear != null && photoYear > deathYear) {
    reasons.push('died_slightly_before_photo');
    return { level: 'medium', score: 0.5, photoYear, reasons };
  }

  reasons.push('lifespan_overlap');
  let level: PeriodConfidenceLevel = 'high';
  let score = 0.9;

  if (birthYear == null || deathYear == null) {
    level = 'medium';
    score = 0.65;
    reasons.push('partial_dates');
  }

  return { level, score, photoYear, reasons };
}

export function resolvePhotoYear(
  takenAt?: string | Date | null,
  estimatedYearFrom?: number | null,
  estimatedYearTo?: number | null,
): number | null {
  if (takenAt) {
    const y = yearFromDate(takenAt);
    if (y != null) return y;
  }
  if (estimatedYearFrom != null && estimatedYearTo != null) {
    return Math.round((estimatedYearFrom + estimatedYearTo) / 2);
  }
  return estimatedYearFrom ?? estimatedYearTo ?? null;
}
