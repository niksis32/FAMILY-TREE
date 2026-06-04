import { Injectable } from '@nestjs/common';
import { mapGedcomPersonToInternalModel } from '@family/genealogy-core';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { workspaceScopedCreateData } from '../../prisma/workspace-scoped-create';
import type { GedcomImportDto, GedcomTextDto } from './gedcom.dto';

interface ParsedIndividual {
  id: string;
  name?: string;
  sex?: string;
  birthDate?: string;
  deathDate?: string;
  fams: string[];
  famc?: string;
  sourceIds: string[];
  notes: string[];
}

interface ParsedFamily {
  id: string;
  husbandId?: string;
  wifeId?: string;
  childIds: string[];
  marriageDate?: string;
  sourceIds: string[];
  notes: string[];
}

interface ParsedSource {
  id: string;
  title: string;
  author?: string;
  notes?: string;
}

interface GedcomParsedData {
  individuals: ParsedIndividual[];
  families: ParsedFamily[];
  sources: ParsedSource[];
  warnings: string[];
  errors: string[];
}

@Injectable()
export class GedcomService {
  constructor(private readonly prisma: PrismaService) {}

  preview(dto: GedcomTextDto) {
    const parsed = this.parseGedcom(dto.gedcomText);

    return {
      fileName: dto.fileName,
      personsFound: parsed.individuals.length,
      familiesFound: parsed.families.length,
      relationshipsFound: this.countRelationships(parsed),
      eventsFound: this.countEvents(parsed),
      sourcesFound: parsed.sources.length,
      errors: parsed.errors,
      warnings: parsed.warnings,
      preview: {
        persons: parsed.individuals.slice(0, 20).map((individual) =>
          mapGedcomPersonToInternalModel({
            id: individual.id,
            name: individual.name,
            sex: individual.sex,
            birthDate: individual.birthDate,
            deathDate: individual.deathDate,
          }),
        ),
        families: parsed.families.slice(0, 20),
        sources: parsed.sources.slice(0, 20),
      },
    };
  }

  async import(dto: GedcomImportDto) {
    const parsed = this.parseGedcom(dto.gedcomText);
    const report = this.preview(dto);

    if (dto.dryRun) {
      return { ...report, imported: false };
    }

    const personIdMap = new Map<string, string>();
    const familyIdMap = new Map<string, string>();

    for (const individual of parsed.individuals) {
      const person = mapGedcomPersonToInternalModel({
        id: individual.id,
        name: individual.name,
        sex: individual.sex,
        birthDate: individual.birthDate,
        deathDate: individual.deathDate,
      });

      const created = await this.prisma.person.create({
        data: workspaceScopedCreateData<Prisma.PersonUncheckedCreateInput>({
          givenName: person.givenName,
          familyName: person.familyName,
          gender: toPrismaGender(person.gender),
          birthDate: parseGedcomDate(individual.birthDate),
          deathDate: parseGedcomDate(individual.deathDate),
          isLiving: !individual.deathDate,
          biography: individual.notes.join('\n') || undefined,
        }),
      });

      personIdMap.set(individual.id, created.id);

      await this.createLifeEvent(created.id, 'BIRTH', individual.birthDate);
      await this.createLifeEvent(created.id, 'DEATH', individual.deathDate);
    }

    for (const source of parsed.sources) {
      await this.prisma.source.create({
        data: workspaceScopedCreateData<Prisma.SourceUncheckedCreateInput>({
          title: source.title,
          author: source.author,
          notes: source.notes,
        }),
      });
    }

    for (const family of parsed.families) {
      const createdFamily = await this.prisma.family.create({
        data: workspaceScopedCreateData<Prisma.FamilyUncheckedCreateInput>({
          name: `GEDCOM family ${family.id}`,
          notes: family.notes.join('\n') || undefined,
        }),
      });
      familyIdMap.set(family.id, createdFamily.id);

      await this.createFamilyMember(createdFamily.id, family.husbandId, personIdMap, 'HUSBAND');
      await this.createFamilyMember(createdFamily.id, family.wifeId, personIdMap, 'WIFE');

      for (const childGedcomId of family.childIds) {
        await this.createFamilyMember(createdFamily.id, childGedcomId, personIdMap, 'CHILD');
        await this.createParentRelationship(family.husbandId, childGedcomId, personIdMap);
        await this.createParentRelationship(family.wifeId, childGedcomId, personIdMap);
      }

      if (family.marriageDate) {
        await this.prisma.event.create({
          data: workspaceScopedCreateData<Prisma.EventUncheckedCreateInput>({
            familyId: createdFamily.id,
            type: 'MARRIAGE',
            date: parseGedcomDate(family.marriageDate),
            description: `GEDCOM marriage event ${family.id}`,
          }),
        });
      }
    }

    return {
      ...report,
      imported: true,
      created: {
        persons: personIdMap.size,
        families: familyIdMap.size,
      },
    };
  }

  private parseGedcom(text: string): GedcomParsedData {
    const individuals = new Map<string, ParsedIndividual>();
    const families = new Map<string, ParsedFamily>();
    const sources = new Map<string, ParsedSource>();
    const warnings: string[] = [];
    const errors: string[] = [];
    let currentType: 'INDI' | 'FAM' | 'SOUR' | null = null;
    let currentId: string | null = null;
    let currentEvent: 'BIRT' | 'DEAT' | 'MARR' | null = null;

    for (const rawLine of text.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line) continue;

      const match = line.match(/^(\d+)\s+(?:(@[^@]+@)\s+)?([A-Z0-9_]+)(?:\s+(.*))?$/);
      if (!match) {
        warnings.push(`Unsupported line: ${line}`);
        continue;
      }

      const level = Number(match[1]);
      const pointer = match[2];
      const tag = match[3];
      const value = match[4]?.trim();

      if (level === 0) {
        currentEvent = null;
        currentId = pointer ? normalizePointer(pointer) : null;
        currentType = tag === 'INDI' || tag === 'FAM' || tag === 'SOUR' ? tag : null;

        if (currentType === 'INDI' && currentId) {
          individuals.set(currentId, { id: currentId, fams: [], sourceIds: [], notes: [] });
        }
        if (currentType === 'FAM' && currentId) {
          families.set(currentId, { id: currentId, childIds: [], sourceIds: [], notes: [] });
        }
        if (currentType === 'SOUR' && currentId) {
          sources.set(currentId, { id: currentId, title: value ?? `Source ${currentId}` });
        }
        continue;
      }

      if (!currentType || !currentId) continue;

      const individual = individuals.get(currentId);
      const family = families.get(currentId);
      const source = sources.get(currentId);

      if (currentType === 'INDI' && individual) {
        if (tag === 'NAME') individual.name = value;
        if (tag === 'SEX') individual.sex = value;
        if (tag === 'FAMS' && value) individual.fams.push(normalizePointer(value));
        if (tag === 'FAMC' && value) individual.famc = normalizePointer(value);
        if (tag === 'SOUR' && value) individual.sourceIds.push(normalizePointer(value));
        if (tag === 'NOTE' && value) individual.notes.push(value);
        if (tag === 'BIRT' || tag === 'DEAT') currentEvent = tag;
        if (tag === 'DATE' && currentEvent === 'BIRT') individual.birthDate = value;
        if (tag === 'DATE' && currentEvent === 'DEAT') individual.deathDate = value;
      }

      if (currentType === 'FAM' && family) {
        if (tag === 'HUSB' && value) family.husbandId = normalizePointer(value);
        if (tag === 'WIFE' && value) family.wifeId = normalizePointer(value);
        if (tag === 'CHIL' && value) family.childIds.push(normalizePointer(value));
        if (tag === 'SOUR' && value) family.sourceIds.push(normalizePointer(value));
        if (tag === 'NOTE' && value) family.notes.push(value);
        if (tag === 'MARR') currentEvent = 'MARR';
        if (tag === 'DATE' && currentEvent === 'MARR') family.marriageDate = value;
      }

      if (currentType === 'SOUR' && source) {
        if (tag === 'TITL' && value) source.title = value;
        if (tag === 'AUTH' && value) source.author = value;
        if (tag === 'NOTE' && value) source.notes = [source.notes, value].filter(Boolean).join('\n');
      }
    }

    if (individuals.size === 0) {
      errors.push('No INDI records found');
    }

    return {
      individuals: [...individuals.values()],
      families: [...families.values()],
      sources: [...sources.values()],
      warnings,
      errors,
    };
  }

  private countRelationships(parsed: GedcomParsedData) {
    return parsed.families.reduce((sum, family) => {
      const parents = [family.husbandId, family.wifeId].filter(Boolean).length;
      return sum + parents * family.childIds.length;
    }, 0);
  }

  private countEvents(parsed: GedcomParsedData) {
    return (
      parsed.individuals.filter((individual) => individual.birthDate).length +
      parsed.individuals.filter((individual) => individual.deathDate).length +
      parsed.families.filter((family) => family.marriageDate).length
    );
  }

  private async createLifeEvent(personId: string, type: 'BIRTH' | 'DEATH', date?: string) {
    if (!date) return;
    await this.prisma.event.create({
      data: workspaceScopedCreateData<Prisma.EventUncheckedCreateInput>({
        personId,
        type,
        date: parseGedcomDate(date),
        description: `GEDCOM ${type.toLowerCase()}`,
      }),
    });
  }

  private async createFamilyMember(
    familyId: string,
    gedcomPersonId: string | undefined,
    personIdMap: Map<string, string>,
    role: 'HUSBAND' | 'WIFE' | 'CHILD',
  ) {
    if (!gedcomPersonId) return;
    const personId = personIdMap.get(gedcomPersonId);
    if (!personId) return;

    await this.prisma.familyMember.create({
      data: workspaceScopedCreateData<Prisma.FamilyMemberUncheckedCreateInput>({
        familyId,
        personId,
        role,
      }),
    });
  }

  private async createParentRelationship(
    parentGedcomId: string | undefined,
    childGedcomId: string,
    personIdMap: Map<string, string>,
  ) {
    if (!parentGedcomId) return;
    const fromPersonId = personIdMap.get(parentGedcomId);
    const toPersonId = personIdMap.get(childGedcomId);
    if (!fromPersonId || !toPersonId) return;

    await this.prisma.relationship.create({
      data: workspaceScopedCreateData<Prisma.RelationshipUncheckedCreateInput>({
        fromPersonId,
        toPersonId,
        type: 'PARENT',
      }),
    });
  }
}

function toPrismaGender(gender?: string | null): 'MALE' | 'FEMALE' | 'OTHER' | 'UNKNOWN' {
  const normalized = gender?.toLowerCase();
  if (normalized === 'male' || normalized === 'm') return 'MALE';
  if (normalized === 'female' || normalized === 'f') return 'FEMALE';
  if (normalized === 'other') return 'OTHER';
  return 'UNKNOWN';
}

function normalizePointer(value: string) {
  return value.replace(/^@|@$/g, '');
}

function parseGedcomDate(value?: string) {
  if (!value) return undefined;

  const parsed = Date.parse(value);
  if (!Number.isNaN(parsed)) {
    return new Date(parsed);
  }

  const year = value.match(/\d{4}/)?.[0];
  return year ? new Date(Date.UTC(Number(year), 0, 1)) : undefined;
}
