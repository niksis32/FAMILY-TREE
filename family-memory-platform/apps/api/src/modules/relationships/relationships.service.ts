import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { validateRelationshipSet, type Person, type Relationship, type RelationshipType } from '@family/genealogy-core';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  workspaceScopedCreateData,
  type WorkspaceScopedUncheckedCreate,
} from '../../prisma/workspace-scoped-create';
import type { CreateRelationshipDto, UpdateRelationshipDto } from './relationships.dto';

@Injectable()
export class RelationshipsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.relationship.findMany({
      where: { deletedAt: null },
      include: { fromPerson: true, toPerson: true, source: true },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });
  }

  async findOne(id: string) {
    const relationship = await this.prisma.relationship.findFirst({
      where: { id, deletedAt: null },
      include: { fromPerson: true, toPerson: true, source: true },
    });
    if (!relationship) throw new NotFoundException('Relationship not found');
    return relationship;
  }

  async create(dto: CreateRelationshipDto) {
    await this.validatePersons(dto.fromPersonId, dto.toPersonId);
    await this.validateWithGenealogyCore({
      id: 'new-relationship',
      fromPersonId: dto.fromPersonId,
      toPersonId: dto.toPersonId,
      type: toCoreRelationshipType(dto.type),
    });
    return this.prisma.relationship.create({
      data: workspaceScopedCreateData(this.toRelationshipCreateData(dto)),
    });
  }

  async update(id: string, dto: UpdateRelationshipDto) {
    const existing = await this.ensureExists(id);
    const candidate = {
      id,
      fromPersonId: dto.fromPersonId ?? existing.fromPersonId,
      toPersonId: dto.toPersonId ?? existing.toPersonId,
      type: toCoreRelationshipType(dto.type ?? existing.type),
    };
    await this.validatePersons(candidate.fromPersonId, candidate.toPersonId);
    await this.validateWithGenealogyCore(candidate, id);
    return this.prisma.relationship.update({ where: { id }, data: this.toRelationshipData(dto) });
  }

  async remove(id: string) {
    await this.ensureExists(id);
    return this.prisma.relationship.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  private async ensureExists(id: string) {
    const relationship = await this.prisma.relationship.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, fromPersonId: true, toPersonId: true, type: true },
    });
    if (!relationship) throw new NotFoundException('Relationship not found');
    return relationship;
  }

  private async validatePersons(fromPersonId: string, toPersonId: string) {
    if (fromPersonId === toPersonId) {
      throw new BadRequestException('Relationship endpoints must be different persons');
    }

    const count = await this.prisma.person.count({
      where: { id: { in: [fromPersonId, toPersonId] }, deletedAt: null },
    });

    if (count !== 2) {
      throw new BadRequestException('Both relationship persons must exist');
    }
  }

  private toRelationshipCreateData(
    dto: CreateRelationshipDto,
  ): WorkspaceScopedUncheckedCreate<Prisma.RelationshipUncheckedCreateInput> {
    return {
      fromPersonId: dto.fromPersonId,
      toPersonId: dto.toPersonId,
      type: dto.type,
      startDate: dto.startDate ? new Date(dto.startDate) : undefined,
      endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      notes: dto.notes,
      confidence: dto.confidence,
      sourceId: dto.sourceId,
    };
  }

  private toRelationshipData(dto: UpdateRelationshipDto): Prisma.RelationshipUncheckedUpdateInput {
    return {
      fromPersonId: dto.fromPersonId,
      toPersonId: dto.toPersonId,
      type: dto.type,
      startDate: dto.startDate ? new Date(dto.startDate) : undefined,
      endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      notes: dto.notes,
      confidence: dto.confidence,
      sourceId: dto.sourceId,
    };
  }

  private async validateWithGenealogyCore(candidate: Relationship, excludeRelationshipId?: string) {
    const existingRelationships = await this.prisma.relationship.findMany({
      where: {
        deletedAt: null,
        id: excludeRelationshipId ? { not: excludeRelationshipId } : undefined,
      },
      select: { id: true, fromPersonId: true, toPersonId: true, type: true },
    });

    const relationships: Relationship[] = [
      ...existingRelationships.map((relationship) => ({
        id: relationship.id,
        fromPersonId: relationship.fromPersonId,
        toPersonId: relationship.toPersonId,
        type: toCoreRelationshipType(relationship.type),
      })),
      candidate,
    ];

    const personIds = [...new Set(relationships.flatMap((relationship) => [relationship.fromPersonId, relationship.toPersonId]))];
    const persons = await this.prisma.person.findMany({
      where: { id: { in: personIds }, deletedAt: null },
      select: { id: true, givenName: true, familyName: true, gender: true, birthDate: true, deathDate: true, isLiving: true, privacyLevel: true },
    });

    const personsById = new Map<string, Person>(
      persons.map((person) => [
        person.id,
        {
          id: person.id,
          givenName: person.givenName,
          familyName: person.familyName,
          gender: person.gender ? person.gender.toLowerCase() : 'unknown',
          birthDate: person.birthDate,
          deathDate: person.deathDate,
          isLiving: person.isLiving,
          privacyLevel: person.privacyLevel.toLowerCase() as Person['privacyLevel'],
        },
      ]),
    );

    const issues = validateRelationshipSet(relationships, personsById);
    if (issues.length > 0) {
      throw new BadRequestException({
        message: 'Relationship validation failed',
        issues,
      });
    }
  }
}

function toCoreRelationshipType(type: string): RelationshipType {
  return type.toLowerCase() as RelationshipType;
}
