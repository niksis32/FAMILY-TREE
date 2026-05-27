import type { Person } from './person.model';
import { buildDisplayName, isLivingPerson } from './person.model';
import type { PrivacyContext } from './privacy-rules';
import { calculatePersonPrivacy, canViewPersonDetails } from './privacy-rules';

export interface StoryPrivacyOptions {
  hideLivingPersons: boolean;
  isPublicGuest: boolean;
  viewer?: PrivacyContext;
}

export interface RedactedPersonPublicView {
  id: string;
  displayName: string;
  birthYear?: number | null;
  deathYear?: number | null;
  isHidden: boolean;
  biography?: string | null;
}

export function redactPersonForStory(
  person: Person,
  options: StoryPrivacyOptions,
): RedactedPersonPublicView | null {
  const living = isLivingPerson(person);
  const level = calculatePersonPrivacy(person);

  if (options.hideLivingPersons && living && level !== 'public') {
    return {
      id: person.id,
      displayName: 'Living person',
      isHidden: true,
    };
  }

  const ctx: PrivacyContext = options.viewer ?? {
    isAuthenticated: !options.isPublicGuest,
    isFamilyMember: !options.isPublicGuest,
  };

  if (living && !canViewPersonDetails(living, ctx, level)) {
    return {
      id: person.id,
      displayName: 'Living person',
      isHidden: true,
    };
  }

  return {
    id: person.id,
    displayName: buildDisplayName(person),
    birthYear: person.birthDate ? new Date(person.birthDate).getFullYear() : null,
    deathYear: person.deathDate ? new Date(person.deathDate).getFullYear() : null,
    isHidden: false,
  };
}

export function filterPersonIdsForStory(
  personIds: string[],
  personsById: Map<string, Person>,
  options: StoryPrivacyOptions,
): string[] {
  return personIds.filter((id) => {
    const person = personsById.get(id);
    if (!person) return false;
    return redactPersonForStory(person, options) !== null;
  });
}
