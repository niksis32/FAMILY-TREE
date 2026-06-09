export const LIVING_INFERENCE_MAX_AGE_YEARS = 100;

export function birthDateToAgeYears(birthDate: string | Date): number {
  const birth = birthDate instanceof Date ? birthDate : new Date(birthDate);
  return (Date.now() - birth.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
}

/**
 * Infer living status: no deathDate + birth within 100 years (or unknown birth) => living.
 * Birth >100 years ago without deathDate => presumed deceased.
 */
export function inferIsLiving(person: {
  birthDate?: string | Date | null;
  deathDate?: string | Date | null;
  isLiving?: boolean | null;
}): boolean {
  if (person.deathDate) return false;
  if (typeof person.isLiving === 'boolean') return person.isLiving;
  if (!person.birthDate) return true;
  return birthDateToAgeYears(person.birthDate) < LIVING_INFERENCE_MAX_AGE_YEARS;
}

export function defaultPrivacyForInferredLiving(isLiving: boolean): 'private' | 'public' {
  return isLiving ? 'private' : 'public';
}
