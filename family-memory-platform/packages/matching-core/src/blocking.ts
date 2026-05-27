import { birthYearBucket, buildFullName, normalizeToken } from './normalize';
import type { PersonMatchSnapshot } from './types';

/** Meilisearch / DB blocking key — no raw PII beyond normalized tokens. */
export function buildBlockingKey(person: PersonMatchSnapshot): string {
  const family = normalizeToken(person.familyName ?? '');
  const given = normalizeToken(person.givenName ?? '');
  const year = birthYearBucket(person.birthDate);
  const place = normalizeToken(person.places?.[0] ?? '').slice(0, 32);
  return [family, given, year ?? 'unknown', place || 'noplace'].filter(Boolean).join('|');
}

export function buildMatchIndexDocument(person: PersonMatchSnapshot & { workspaceId: string }) {
  return {
    id: person.personId,
    personId: person.personId,
    workspaceId: person.workspaceId,
    blockingKey: buildBlockingKey(person),
    fullName: buildFullName(person),
    birthYear: person.birthDate ? new Date(person.birthDate).getUTCFullYear() : null,
    deathYear: person.deathDate ? new Date(person.deathDate).getUTCFullYear() : null,
    placeHint: person.places?.[0] ?? null,
  };
}
