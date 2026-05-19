import type { PersonSummary } from '@family/shared';

/**
 * Normalized person node for tree rendering and graph export.
 * Iteration: enrich with names (AKA), facts, media refs.
 */
export interface TreePersonNode extends PersonSummary {
  /** Display label for tree cards */
  displayName: string;
  /** Generation hint for layout algorithms */
  generation?: number;
}

export function buildDisplayName(person: Pick<PersonSummary, 'givenName' | 'familyName'>): string {
  return [person.givenName, person.familyName].filter(Boolean).join(' ').trim();
}
