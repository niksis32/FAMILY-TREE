/**
 * GEDCOM 5.5.1 import/export mapping stubs.
 * Iteration: parse INDI/FAM records, map to Prisma entities via api/gedcom module.
 */

export interface GedcomImportResult {
  personsCount: number;
  familiesCount: number;
  warnings: string[];
}

export function mapGedcomToDomain(_gedcomText: string): GedcomImportResult {
  return {
    personsCount: 0,
    familiesCount: 0,
    warnings: ['GEDCOM parser not implemented — skeleton only'],
  };
}
