import type { RelationshipType } from '@family/shared';

/**
 * Kinship validation and inverse mapping.
 * Iteration: implement full GEDCOM / FHIR-style relationship matrix.
 */

const INVERSE_MAP: Partial<Record<RelationshipType, RelationshipType>> = {
  parent: 'child',
  child: 'parent',
  spouse: 'spouse',
  sibling: 'sibling',
};

export function getInverseRelationship(type: RelationshipType): RelationshipType | undefined {
  return INVERSE_MAP[type];
}

export function isBidirectionalSymmetric(type: RelationshipType): boolean {
  return type === 'spouse' || type === 'sibling' || type === 'partner';
}
