import type { Gender, Person, PrivacyLevel, Relationship, RelationshipType } from './person.model';
import {
  detectRelationshipCycles,
  isBidirectionalSymmetric,
  normalizeRelationshipType,
  validateParentChildAge,
} from './relationship.rules';

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

  if (person.gender && !isAllowedGender(person.gender)) {
    issues.push({
      code: 'person.gender.invalid',
      message: `Unsupported gender value: ${person.gender}`,
      entityId: person.id,
    });
  }

  if (person.privacyLevel && !isAllowedPrivacyLevel(person.privacyLevel)) {
    issues.push({
      code: 'person.privacy.invalid',
      message: `Unsupported privacy level: ${person.privacyLevel}`,
      entityId: person.id,
    });
  }

  if (person.birthDate && !isValidDateLike(person.birthDate)) {
    issues.push({
      code: 'person.birthDate.invalid',
      message: 'Birth date is not parseable',
      entityId: person.id,
    });
  }

  if (person.deathDate && !isValidDateLike(person.deathDate)) {
    issues.push({
      code: 'person.deathDate.invalid',
      message: 'Death date is not parseable',
      entityId: person.id,
    });
  }

  if (person.birthDate && person.deathDate && isValidDateLike(person.birthDate) && isValidDateLike(person.deathDate) && toTime(person.deathDate) < toTime(person.birthDate)) {
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
    if (!isAllowedRelationshipType(relationship.type)) {
      issues.push({
        code: 'relationship.type.invalid',
        message: `Unsupported relationship type: ${relationship.type}`,
        entityId: relationship.id,
      });
      continue;
    }

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

  for (const issue of validateRelationshipDuplicates(relationships)) {
    issues.push(issue);
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

function validateRelationshipDuplicates(relationships: Relationship[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const seen = new Map<string, Relationship>();

  for (const relationship of relationships) {
    const key = relationshipKey(relationship);
    const existing = seen.get(key);

    if (existing) {
      issues.push({
        code: 'relationship.duplicate',
        message: `Duplicate relationship ${relationship.type} between the same persons`,
        entityId: relationship.id,
      });
      continue;
    }

    seen.set(key, relationship);
  }

  return issues;
}

function relationshipKey(relationship: Relationship): string {
  if (isBidirectionalSymmetric(relationship.type)) {
    return [relationship.type, ...[relationship.fromPersonId, relationship.toPersonId].sort()].join(':');
  }

  return [relationship.type, relationship.fromPersonId, relationship.toPersonId].join(':');
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

function isValidDateLike(value: string | Date): boolean {
  return !Number.isNaN(toTime(value));
}

function isAllowedGender(value: string): value is Gender {
  return ['female', 'male', 'other', 'unknown'].includes(value);
}

function isAllowedPrivacyLevel(value: string): value is PrivacyLevel {
  return ['public', 'family', 'private'].includes(value);
}

function isAllowedRelationshipType(value: string): value is RelationshipType {
  const normalized = normalizeRelationshipType(value);
  return ['parent', 'child', 'spouse', 'sibling', 'partner', 'adoptive_parent', 'adoptive_child', 'unknown'].includes(
    normalized,
  );
}
