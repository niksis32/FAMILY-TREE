import type { Person, Relationship, RelationshipType } from './person.model';

const INVERSE_MAP: Record<RelationshipType, RelationshipType> = {
  parent: 'child',
  child: 'parent',
  spouse: 'spouse',
  sibling: 'sibling',
  partner: 'partner',
  adoptive_parent: 'adoptive_child',
  adoptive_child: 'adoptive_parent',
  unknown: 'unknown',
};

/** Prisma/API enums use `PARENT`; core model uses `parent`. */
export function normalizeRelationshipType(type: string): RelationshipType {
  return type.trim().toLowerCase() as RelationshipType;
}

export function getInverseRelationship(type: RelationshipType | string): RelationshipType {
  return INVERSE_MAP[normalizeRelationshipType(type)];
}

export function isBidirectionalSymmetric(type: RelationshipType): boolean {
  return type === 'spouse' || type === 'sibling' || type === 'partner';
}

export function getParentChildDirection(relationship: {
  fromPersonId: string;
  toPersonId: string;
  type: string;
}): { parentId: string; childId: string } | null {
  const type = normalizeRelationshipType(relationship.type);

  if (type === 'parent' || type === 'adoptive_parent') {
    return { parentId: relationship.fromPersonId, childId: relationship.toPersonId };
  }

  if (type === 'child' || type === 'adoptive_child') {
    return { parentId: relationship.toPersonId, childId: relationship.fromPersonId };
  }

  return null;
}

export function detectRelationshipCycles(relationships: Relationship[]): string[][] {
  const graph = new Map<string, string[]>();

  for (const relationship of relationships) {
    const direction = getParentChildDirection(relationship);
    if (!direction) {
      continue;
    }

    const children = graph.get(direction.parentId) ?? [];
    children.push(direction.childId);
    graph.set(direction.parentId, children);
  }

  const cycles: string[][] = [];
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const stack: string[] = [];

  function visit(personId: string) {
    if (visiting.has(personId)) {
      const cycleStart = stack.indexOf(personId);
      cycles.push([...stack.slice(cycleStart), personId]);
      return;
    }

    if (visited.has(personId)) {
      return;
    }

    visiting.add(personId);
    stack.push(personId);

    for (const childId of graph.get(personId) ?? []) {
      visit(childId);
    }

    stack.pop();
    visiting.delete(personId);
    visited.add(personId);
  }

  for (const personId of graph.keys()) {
    visit(personId);
  }

  return cycles;
}

export function validateParentChildAge(
  parent: Pick<Person, 'birthDate'>,
  child: Pick<Person, 'birthDate'>,
  options: { minimumAge?: number; maximumAge?: number } = {},
): { valid: boolean; reason?: string; ageDifference?: number } {
  const minimumAge = options.minimumAge ?? 12;
  const maximumAge = options.maximumAge ?? 80;
  const parentYear = getYear(parent.birthDate);
  const childYear = getYear(child.birthDate);

  if (!parentYear || !childYear) {
    return { valid: true };
  }

  const ageDifference = childYear - parentYear;

  if (ageDifference < minimumAge) {
    return {
      valid: false,
      reason: `Parent is too young: ${ageDifference} years`,
      ageDifference,
    };
  }

  if (ageDifference > maximumAge) {
    return {
      valid: false,
      reason: `Parent age difference is unrealistic: ${ageDifference} years`,
      ageDifference,
    };
  }

  return { valid: true, ageDifference };
}

function getYear(value?: string | Date | null): number | null {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.getUTCFullYear();
  }

  const match = value.match(/\d{4}/);
  return match ? Number(match[0]) : null;
}
