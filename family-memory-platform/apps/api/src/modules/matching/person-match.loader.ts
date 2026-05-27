import { Injectable } from '@nestjs/common';
import { RelationshipType } from '@prisma/client';
import type { PersonMatchSnapshot } from '@family/matching-core';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PersonMatchLoader {
  constructor(private readonly prisma: PrismaService) {}

  async loadSnapshot(personId: string, workspaceId: string): Promise<PersonMatchSnapshot | null> {
    const person = await this.prisma.person.findFirst({
      where: { id: personId, deletedAt: null },
      include: {
        nameAliases: true,
        events: {
          where: { deletedAt: null },
          include: { place: true },
        },
        citations: { where: { deletedAt: null }, select: { sourceId: true } },
        documents: { where: { deletedAt: null }, select: { title: true, sourceId: true } },
        relationshipsFrom: {
          where: { deletedAt: null },
          include: { toPerson: { select: { givenName: true, familyName: true, patronymic: true } } },
        },
        relationshipsTo: {
          where: { deletedAt: null },
          include: { fromPerson: { select: { givenName: true, familyName: true, patronymic: true } } },
        },
      },
    });
    if (!person) return null;

    const relName = (p: { givenName: string; familyName: string | null; patronymic: string | null }) =>
      [p.givenName, p.patronymic, p.familyName].filter(Boolean).join(' ');

    const spouseNames: string[] = [];
    const parentNames: string[] = [];
    const childNames: string[] = [];

    for (const rel of person.relationshipsFrom) {
      const name = relName(rel.toPerson);
      if (rel.type === RelationshipType.SPOUSE || rel.type === RelationshipType.PARTNER) spouseNames.push(name);
      if (rel.type === RelationshipType.PARENT || rel.type === RelationshipType.ADOPTIVE_PARENT) parentNames.push(name);
      if (rel.type === RelationshipType.CHILD || rel.type === RelationshipType.ADOPTIVE_CHILD) childNames.push(name);
    }
    for (const rel of person.relationshipsTo) {
      const name = relName(rel.fromPerson);
      if (rel.type === RelationshipType.SPOUSE || rel.type === RelationshipType.PARTNER) spouseNames.push(name);
      if (rel.type === RelationshipType.CHILD || rel.type === RelationshipType.ADOPTIVE_CHILD) parentNames.push(name);
      if (rel.type === RelationshipType.PARENT || rel.type === RelationshipType.ADOPTIVE_PARENT) childNames.push(name);
    }

    const places = person.events
      .map((e) => [e.place?.name, e.place?.city, e.place?.country].filter(Boolean).join(', '))
      .filter(Boolean) as string[];

    const birthYear = person.birthDate?.getUTCFullYear();
    const deathYear = person.deathDate?.getUTCFullYear();

    const sourceIds = [
      ...person.citations.map((c) => c.sourceId),
      ...person.documents.map((d) => d.sourceId).filter((id): id is string => Boolean(id)),
    ];

    return {
      personId: person.id,
      workspaceId,
      givenName: person.givenName,
      patronymic: person.patronymic,
      familyName: person.familyName,
      birthDate: person.birthDate?.toISOString() ?? null,
      deathDate: person.deathDate?.toISOString() ?? null,
      gender: person.gender,
      aliases: person.nameAliases.map((a) => ({
        givenName: a.givenName,
        patronymic: a.patronymic,
        familyName: a.familyName,
      })),
      places,
      spouseNames,
      parentNames,
      childNames,
      sourceIds: [...new Set(sourceIds)],
      documentTitles: person.documents.map((d) => d.title),
      avatarMediaId: person.avatarMediaId,
      historicalPeriod: {
        from: birthYear ?? null,
        to: deathYear ?? birthYear ?? null,
      },
    };
  }

  async loadFamilyPersonIds(familyId: string): Promise<string[]> {
    const members = await this.prisma.familyMember.findMany({
      where: { familyId, deletedAt: null },
      select: { personId: true },
    });
    return members.map((m) => m.personId);
  }
}
