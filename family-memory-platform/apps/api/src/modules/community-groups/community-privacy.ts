import { ForumContentStatus } from '@prisma/client';

/**
 * G1: living-person data must not appear as public without explicit consent.
 * Returns effective status for a new forum post / thread body.
 */
export function resolveInitialContentStatus(params: {
  referencesLivingPersonData: boolean;
  hasConsentForPublicLivingData: boolean;
}): ForumContentStatus {
  if (params.referencesLivingPersonData && !params.hasConsentForPublicLivingData) {
    return ForumContentStatus.PENDING_REVIEW;
  }
  return ForumContentStatus.PUBLISHED;
}

export function isPubliclyVisibleContent(status: ForumContentStatus): boolean {
  return status === ForumContentStatus.PUBLISHED;
}
