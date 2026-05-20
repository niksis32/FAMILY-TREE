import type { Person, Relationship } from './person.model';
import { detectRelationshipCycles, validateParentChildAge } from './relationship.rules';

export interface ValidationIssue {
  code: string;
  message: string;
  entityId?: string;
}

export function validatePerson(person: Person): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!person.id.trim()) {
    issues.push({ code: 'person.id.required', message: 'Person id is required' });
  }

  if (!person.givenName.trim()) {
    issues.push({ code: 'person.givenName.required', message: 'Given name is required', entityId: person.id });
  }

  if (person.birthDate && person.deathDate && toTime(person.deathDate) < toTime(person.birthDate)) {
    issues.push({
      code: 'person.dates.invalid_order',
      message: 'Death date cannot be before birth date',
      entityId: person.id,
    });
  }

  return issues;
}

export function validateRelationshipSet(relationships: Relationship[], personsById: Map<string, Person>): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  for (const relationship of relationships) {
    if (!personsById.has(relationship.fromPersonId) || !personsById.has(relationship.toPersonId)) {
      issues.push({
        code: 'relationship.person.missing',
        message: 'Relationship references unknown person',
        entityId: relationship.id,
      });
      continue;
    }

    if (relationship.fromPersonId === relationship.toPersonId) {
      issues.push({
        code: 'relationship.self_reference',
        message: 'Relationship cannot reference the same person twice',
        entityId: relationship.id,
      });
    }
  }

  for (const cycle of detectRelationshipCycles(relationships)) {
    issues.push({
      code: 'relationship.cycle',
      message: `Parent-child cycle detected: ${cycle.join(' -> ')}`,
    });
  }

  for (const relationship of relationships) {
    const parentChild = getParentChildPair(relationship, personsById);
    if (!parentChild) {
      continue;
    }

    const result = validateParentChildAge(parentChild.parent, parentChild.child);
    if (!result.valid) {
      issues.push({
        code: 'relationship.parent_child_age',
        message: result.reason ?? 'Invalid parent-child age difference',
        entityId: relationship.id,
      });
    }
  }

  return issues;
}

function getParentChildPair(
  relationship: Relationship,
  personsById: Map<string, Person>,
): { parent: Person; child: Person } | null {
  if (relationship.type === 'parent' || relationship.type === 'adoptive_parent') {
    const parent = personsById.get(relationship.fromPersonId);
    const child = personsById.get(relationship.toPersonId);
    return parent && child ? { parent, child } : null;
  }

  if (relationship.type === 'child' || relationship.type === 'adoptive_child') {
    const parent = personsById.get(relationship.toPersonId);
    const child = personsById.get(relationship.fromPersonId);
    return parent && child ? { parent, child } : null;
  }

  return null;
}

function toTime(value: string | Date): number {
  return value instanceof Date ? value.getTime() : Date.parse(value);
}
