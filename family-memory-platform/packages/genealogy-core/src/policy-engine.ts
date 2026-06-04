import type { Person, PrivacyLevel } from './person.model';
import { buildDisplayName, isLivingPerson } from './person.model';
import { calculatePersonPrivacy, canViewPersonDetails, type PrivacyContext } from './privacy-rules';

export type ViewerRole = 'anonymous' | 'viewer' | 'editor' | 'admin';

export interface PolicyViewerContext extends PrivacyContext {
  role: ViewerRole;
  isPublicLink: boolean;
}

export interface PolicyPersonRecord {
  id: string;
  givenName: string;
  familyName?: string | null;
  patronymic?: string | null;
  birthDate?: string | null;
  deathDate?: string | null;
  isLiving: boolean;
  privacyLevel?: PrivacyLevel | string | null;
  biography?: string | null;
}

export interface PolicyMediaRecord {
  id: string;
  privacyLevel?: PrivacyLevel | string | null;
  personId?: string | null;
  linkedPersonIsLiving?: boolean;
}

export interface PolicyDocumentRecord {
  id: string;
  privacyLevel?: PrivacyLevel | string | null;
  personId?: string | null;
  linkedPersonIsLiving?: boolean;
}

export function normalizePrivacyLevel(level?: string | null): PrivacyLevel {
  const v = (level ?? 'private').toLowerCase();
  if (v === 'public') return 'public';
  if (v === 'family') return 'family';
  return 'private';
}

export function buildPolicyViewer(params: {
  userId?: string;
  role?: ViewerRole;
  isFamilyMember?: boolean;
  isPublicLink?: boolean;
}): PolicyViewerContext {
  const role = params.role ?? (params.userId ? 'viewer' : 'anonymous');
  const isAuthenticated = Boolean(params.userId);
  const isFamilyMember =
    params.isFamilyMember ?? (role === 'editor' || role === 'admin' || (isAuthenticated && role !== 'anonymous'));

  return {
    viewerUserId: params.userId,
    isAuthenticated,
    isFamilyMember,
    role,
    isPublicLink: params.isPublicLink ?? false,
  };
}

export function effectivePersonPrivacy(person: PolicyPersonRecord): PrivacyLevel {
  return calculatePersonPrivacy({
    privacyLevel: normalizePrivacyLevel(person.privacyLevel as string),
    deathDate: person.deathDate ?? null,
    isLiving: person.isLiving,
  });
}

export function canViewPerson(
  person: PolicyPersonRecord,
  viewer: PolicyViewerContext,
  options?: { hideLivingPersons?: boolean },
): boolean {
  const level = effectivePersonPrivacy(person);
  const living = isLivingPerson(person);

  if (options?.hideLivingPersons !== false && living && (viewer.role === 'anonymous' || viewer.role === 'viewer')) {
    if (level !== 'public') return false;
  }

  if (viewer.isPublicLink && living && level !== 'public') {
    return false;
  }

  return canViewPersonDetails(living, viewer, level);
}

export function redactPersonForViewer(
  person: PolicyPersonRecord,
  viewer: PolicyViewerContext,
  options?: { hideLivingPersons?: boolean },
): PolicyPersonRecord | null {
  if (!canViewPerson(person, viewer, options)) {
    return null;
  }

  const living = isLivingPerson(person);
  if (living && viewer.role === 'anonymous' && effectivePersonPrivacy(person) === 'public') {
    return {
      ...person,
      biography: null,
      birthDate: person.birthDate ? `${person.birthDate.slice(0, 4)}` : null,
    };
  }

  return person;
}

export function redactPersonAsHiddenPlaceholder(personId: string): PolicyPersonRecord {
  return {
    id: personId,
    givenName: 'Living',
    familyName: 'person',
    isLiving: true,
    privacyLevel: 'private',
    biography: null,
    birthDate: null,
    deathDate: null,
  };
}

export function buildHiddenDisplayName(): string {
  return 'Living person';
}

export function buildPrivatePersonDisplayName(): string {
  return 'Private person';
}

export interface RedactedTreeNodeFields {
  label: string;
  givenName: string;
  familyName: string | null;
  birthDate: string | null;
  deathDate: string | null;
  birthYear: number | null;
  deathYear: number | null;
  isLiving: boolean;
  isHidden: boolean;
  avatarUrl: string | null;
}

export function redactHiddenTreeNodeFields(person: PolicyPersonRecord): RedactedTreeNodeFields {
  const living = isLivingPerson(person);
  const label = living ? buildHiddenDisplayName() : buildPrivatePersonDisplayName();
  return {
    label,
    givenName: living ? 'Living' : 'Private',
    familyName: 'person',
    birthDate: null,
    deathDate: null,
    birthYear: null,
    deathYear: null,
    isLiving: living,
    isHidden: true,
    avatarUrl: null,
  };
}

export function canViewMedia(
  media: PolicyMediaRecord,
  viewer: PolicyViewerContext,
  person?: PolicyPersonRecord | null,
): boolean {
  const mediaLevel = normalizePrivacyLevel(media.privacyLevel as string);
  const personLiving = person?.isLiving ?? media.linkedPersonIsLiving ?? false;

  if (personLiving && (viewer.role === 'anonymous' || viewer.isPublicLink)) {
    return mediaLevel === 'public' && (!person || canViewPerson(person, viewer));
  }

  if (mediaLevel === 'public') return true;
  if (mediaLevel === 'private') {
    return viewer.isAuthenticated && viewer.isFamilyMember && viewer.role !== 'viewer';
  }
  return viewer.isAuthenticated && viewer.isFamilyMember;
}

export function canViewDocument(
  doc: PolicyDocumentRecord,
  viewer: PolicyViewerContext,
  person?: PolicyPersonRecord | null,
): boolean {
  const docLevel = normalizePrivacyLevel(doc.privacyLevel as string);
  if (docLevel === 'public') return true;
  if (person && !canViewPerson(person, viewer)) return false;
  if (docLevel === 'private') {
    return viewer.isAuthenticated && viewer.isFamilyMember && viewer.role !== 'viewer';
  }
  return viewer.isAuthenticated && viewer.isFamilyMember;
}

export function defaultPrivacyForNewLivingPerson(): PrivacyLevel {
  return 'private';
}

export function treeNodeLabel(person: PolicyPersonRecord, hidden: boolean): string {
  if (hidden) return buildHiddenDisplayName();
  return buildDisplayName(person as Person);
}
