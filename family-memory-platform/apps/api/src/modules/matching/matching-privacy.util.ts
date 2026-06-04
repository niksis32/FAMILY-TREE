import type { PrivacyLevel } from '@prisma/client';

/** Persons with PRIVATE level must never participate in cross-workspace global matching. */
export function isEligibleForGlobalMatching(person: {
  privacyLevel?: PrivacyLevel | string;
}): boolean {
  if (person.privacyLevel == null) return true;
  return String(person.privacyLevel).toUpperCase() !== 'PRIVATE';
}

export function isCrossWorkspace(sourceWorkspaceId: string, targetWorkspaceId: string): boolean {
  return sourceWorkspaceId !== targetWorkspaceId;
}
