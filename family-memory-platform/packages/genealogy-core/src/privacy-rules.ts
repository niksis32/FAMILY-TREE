import type { Person, PrivacyLevel } from './person.model';
import { buildDisplayName, isLivingPerson } from './person.model';
import type { RelationshipTreeNode } from './tree-builder';

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
