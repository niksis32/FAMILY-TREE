import type { Person, PrivacyLevel } from './person.model';
import { buildDisplayName, isLivingPerson } from './person.model';
import type { RelationshipTreeNode } from './tree-builder';

export type PrivacyViewerRole = 'anonymous' | 'viewer' | 'editor' | 'admin';

export interface PrivacyContext {
  viewerUserId?: string;
  isAuthenticated: boolean;
  isFamilyMember: boolean;
  role?: PrivacyViewerRole;
}

function viewerRole(ctx: PrivacyContext): PrivacyViewerRole {
  if (ctx.role) return ctx.role;
  if (!ctx.viewerUserId) return 'anonymous';
  return ctx.isFamilyMember ? 'editor' : 'anonymous';
}

export function canViewPersonDetails(
  isLiving: boolean,
  ctx: PrivacyContext,
  level: PrivacyLevel = 'family',
): boolean {
  const role = viewerRole(ctx);

  if (level === 'private') {
    if (!ctx.viewerUserId || !ctx.isFamilyMember) return false;
    return role !== 'viewer';
  }

  if (level === 'public') {
    if (!isLiving) return true;
    return true;
  }

  if (!isLiving) {
    return ctx.isAuthenticated && ctx.isFamilyMember;
  }

  return ctx.isAuthenticated && ctx.isFamilyMember;
}

export function calculatePersonPrivacy(person: Pick<Person, 'privacyLevel' | 'deathDate' | 'isLiving'>): PrivacyLevel {
  if (person.privacyLevel) {
    return person.privacyLevel;
  }

  return isLivingPerson(person) ? 'family' : 'public';
}

export interface PublicTreeNode extends RelationshipTreeNode {
  person?: Person;
  isHidden?: boolean;
  displayName?: string;
  children: PublicTreeNode[];
}

export function hideLivingPersonsForPublicView<T extends RelationshipTreeNode>(
  tree: T,
  personsById: Map<string, Person> | Record<string, Person> = {},
): PublicTreeNode {
  const person = getPerson(personsById, tree.personId);
  const shouldHide = person ? isLivingPerson(person) && calculatePersonPrivacy(person) !== 'public' : false;

  return {
    ...tree,
    person: shouldHide ? undefined : person,
    isHidden: shouldHide,
    displayName: shouldHide ? 'Living person' : person ? buildDisplayName(person) : undefined,
    children: tree.children.map((child) => hideLivingPersonsForPublicView(child, personsById)),
  };
}

function getPerson(personsById: Map<string, Person> | Record<string, Person>, personId: string): Person | undefined {
  if (personsById instanceof Map) {
    return personsById.get(personId);
  }

  return personsById[personId];
}
