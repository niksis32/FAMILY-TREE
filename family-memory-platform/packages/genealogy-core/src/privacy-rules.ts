/**
 * Privacy gates for living persons and role-based visibility.
 * Iteration: tie to User roles and Person.isLiving flag from DB.
 */

export type PrivacyLevel = 'public' | 'family' | 'private';

export interface PrivacyContext {
  viewerUserId?: string;
  isAuthenticated: boolean;
  isFamilyMember: boolean;
}

export function canViewPersonDetails(
  isLiving: boolean,
  ctx: PrivacyContext,
  level: PrivacyLevel = 'family',
): boolean {
  if (!isLiving) return true;
  if (level === 'public') return false;
  if (level === 'private') return ctx.viewerUserId !== undefined && ctx.isFamilyMember;
  return ctx.isAuthenticated && ctx.isFamilyMember;
}
