import type { Gender, Person } from './person.model';

export interface GedcomImportResult {
  personsCount: number;
  familiesCount: number;
  warnings: string[];
}

export interface GedcomPersonRecord {
  id: string;
  name?: string;
  sex?: string;
  birthDate?: string;
  deathDate?: string;
}

export function mapGedcomToDomain(_gedcomText: string): GedcomImportResult {
  return {
    personsCount: 0,
    familiesCount: 0,
    warnings: ['GEDCOM bulk parser is not implemented in MVP core'],
  };
}

export function mapGedcomPersonToInternalModel(record: GedcomPersonRecord): Person {
  const parsedName = parseGedcomName(record.name);

  return {
    id: normalizeGedcomId(record.id),
    givenName: parsedName.givenName,
    familyName: parsedName.familyName,
    gender: mapGedcomSex(record.sex),
    birthDate: record.birthDate ?? null,
    deathDate: record.deathDate ?? null,
    isLiving: !record.deathDate,
    privacyLevel: record.deathDate ? 'public' : 'family',
  };
}

export function mapInternalPersonToGedcom(person: Person): GedcomPersonRecord {
  return {
    id: person.id,
    name: formatGedcomName(person),
    sex: mapInternalGender(person.gender),
    birthDate: normalizeDateValue(person.birthDate),
    deathDate: normalizeDateValue(person.deathDate),
  };
}

function normalizeGedcomId(id: string): string {
  return id.replace(/^@|@$/g, '');
}

function parseGedcomName(name?: string): Pick<Person, 'givenName' | 'familyName'> {
  const normalized = name?.trim();

  if (!normalized) {
    return { givenName: 'Unknown', familyName: null };
  }

  const surnameMatch = normalized.match(/\/([^/]+)\//);
  const familyName = surnameMatch?.[1]?.trim() || null;

  if (familyName) {
    return {
      givenName: normalized.replace(/\/[^/]+\//, '').replace(/\s+/g, ' ').trim() || 'Unknown',
      familyName,
    };
  }

  if (normalized.includes(',')) {
    const [lastName, ...givenParts] = normalized.split(',');
    const givenName = givenParts.join(',').trim();
    return {
      givenName: givenName || 'Unknown',
      familyName: lastName.trim() || null,
    };
  }

  const parts = normalized.split(/\s+/).filter(Boolean);
  const givenName = parts[0] ?? 'Unknown';
  const fallbackFamilyName = parts.length > 1 ? parts.slice(1).join(' ') : null;

  return { givenName, familyName: fallbackFamilyName };
}

function formatGedcomName(person: Pick<Person, 'givenName' | 'familyName'>): string {
  return person.familyName ? `${person.givenName} /${person.familyName}/` : person.givenName;
}

function mapGedcomSex(sex?: string): Gender {
  const normalized = sex?.trim().toUpperCase();
  if (normalized === 'F') return 'female';
  if (normalized === 'M') return 'male';
  if (normalized === 'X' || normalized === 'O') return 'other';
  return 'unknown';
}

function mapInternalGender(gender?: string | null): string | undefined {
  const normalized = gender?.toLowerCase();
  if (normalized === 'female') return 'F';
  if (normalized === 'male') return 'M';
  if (normalized === 'other') return 'X';
  return undefined;
}

function normalizeDateValue(value?: string | Date | null): string | undefined {
  if (!value) {
    return undefined;
  }

  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  return value;
}
