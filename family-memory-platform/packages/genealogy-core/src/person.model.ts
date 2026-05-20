export type Gender = 'female' | 'male' | 'other' | 'unknown';
export type PrivacyLevel = 'public' | 'family' | 'private';
export type RelationshipType =
  | 'parent'
  | 'child'
  | 'spouse'
  | 'sibling'
  | 'partner'
  | 'adoptive_parent'
  | 'adoptive_child'
  | 'unknown';

export interface Person {
  id: string;
  givenName: string;
  familyName?: string | null;
  middleName?: string | null;
  gender?: Gender | string | null;
  birthDate?: string | Date | null;
  deathDate?: string | Date | null;
  isLiving?: boolean | null;
  privacyLevel?: PrivacyLevel | null;
  primaryPhotoUrl?: string | null;
}

export interface Relationship {
  id: string;
  fromPersonId: string;
  toPersonId: string;
  type: RelationshipType;
}

export interface TreePersonNode extends Person {
  displayName: string;
  generation?: number;
  isHidden?: boolean;
}

export interface TimelineEvent {
  id: string;
  personId?: string;
  type: string;
  title: string;
  date?: string | Date | null;
  place?: string | null;
  description?: string | null;
}

export interface TimelineItem extends TimelineEvent {
  sortKey: number;
  year?: number;
}

export function buildDisplayName(person: Pick<Person, 'givenName' | 'familyName' | 'middleName'>): string {
  return [person.givenName, person.middleName, person.familyName].filter(Boolean).join(' ').trim();
}

export function isLivingPerson(person: Pick<Person, 'isLiving' | 'deathDate'>): boolean {
  if (typeof person.isLiving === 'boolean') {
    return person.isLiving;
  }

  return !person.deathDate;
}
