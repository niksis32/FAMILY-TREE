import {
  computePeriodConfidence,
  resolvePhotoYear,
  type PeriodConfidenceResult,
  type PhotoFaceTagRecord,
  type PhotoInsightRecord,
} from '@family/shared';

export function getTagPeriodConfidence(
  tag: PhotoFaceTagRecord,
  takenAt?: string | null,
  insight?: PhotoInsightRecord | null,
): PeriodConfidenceResult | null {
  if (!tag.person) return null;
  const photoYear = resolvePhotoYear(takenAt, insight?.estimatedYearFrom, insight?.estimatedYearTo);
  return computePeriodConfidence({
    photoYear,
    birthDate: tag.person.birthDate,
    deathDate: tag.person.deathDate,
    isLiving: tag.person.isLiving,
  });
}
