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
  if (!name) {
    return { givenName: 'Unknown', familyName: null };
  }

  const surnameMatch = name.match(/\/([^/]+)\//);
  const familyName = surnameMatch?.[1]?.trim() || null;
  const givenName = name.replace(/\/[^/]+\//, '').trim() || 'Unknown';

  return { givenName, familyName };
}

function formatGedcomName(person: Pick<Person, 'givenName' | 'familyName'>): string {
  return person.familyName ? `${person.givenName} /${person.familyName}/` : person.givenName;
}

function mapGedcomSex(sex?: string): Gender {
  if (sex === 'F') return 'female';
  if (sex === 'M') return 'male';
  return 'unknown';
}

function mapInternalGender(gender?: string | null): string | undefined {
  if (gender === 'female') return 'F';
  if (gender === 'male') return 'M';
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
