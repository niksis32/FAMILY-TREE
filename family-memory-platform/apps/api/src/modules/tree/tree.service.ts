import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { TreeGraphResponse, TreePersonNode, TreeRelationshipEdge, TreeViewMode } from './tree.types';

type DbPerson = {
  id: string;
  givenName: string;
  familyName?: string | null;
  birthDate?: Date | null;
  deathDate?: Date | null;
  isLiving?: boolean;
};

type DbRelationship = {
  id: string;
  fromPersonId: string;
  toPersonId: string;
  type: string;
};

@Injectable()
export class TreeService {
  constructor(private readonly prisma: PrismaService) {}

  async getAncestors(personId: string): Promise<TreeGraphResponse> {
    return this.buildGraph(personId, 'ancestors');
  }

  async getDescendants(personId: string): Promise<TreeGraphResponse> {
    return this.buildGraph(personId, 'descendants');
  }

  async getFullGraph(personId: string): Promise<TreeGraphResponse> {
    return this.buildGraph(personId, 'full');
  }

  private async buildGraph(rootPersonId: string, mode: TreeViewMode): Promise<TreeGraphResponse> {
    const prisma = this.prisma as unknown as {
      person: {
        findUnique: (args: { where: { id: string }; select: { id: true } }) => Promise<{ id: string } | null>;
        findMany: (args: { where: { id: { in: string[] } } }) => Promise<DbPerson[]>;
      };
      relationship: {
        findMany: () => Promise<DbRelationship[]>;
      };
    };

    const root = await prisma.person.findUnique({ where: { id: rootPersonId }, select: { id: true } });
    if (!root) {
      throw new NotFoundException('Root person not found');
    }

    const relationships = await prisma.relationship.findMany();
    const generations = this.collectPersonGenerations(rootPersonId, relationships, mode);
    const personIds = [...generations.keys()];
    const persons = await prisma.person.findMany({ where: { id: { in: personIds } } });
    const personIdSet = new Set(persons.map((person) => person.id));

    const edges = relationships
      .filter((relationship) => personIdSet.has(relationship.fromPersonId) && personIdSet.has(relationship.toPersonId))
      .map((relationship) => this.toTreeEdge(relationship));

    return {
      rootPersonId,
      mode,
      nodes: persons.map((person) => this.toTreeNode(person, generations.get(person.id) ?? 0)),
      edges,
    };
  }

  private collectPersonGenerations(rootPersonId: string, relationships: DbRelationship[], mode: TreeViewMode) {
    if (mode === 'ancestors') {
      return this.walk(rootPersonId, this.buildAncestorAdjacency(relationships), -1);
    }

    if (mode === 'descendants') {
      return this.walk(rootPersonId, this.buildDescendantAdjacency(relationships), 1);
    }

    return this.walk(rootPersonId, this.buildUndirectedAdjacency(relationships), 1);
  }

  private walk(rootPersonId: string, adjacency: Map<string, string[]>, generationStep: 1 | -1) {
    const generations = new Map<string, number>([[rootPersonId, 0]]);
    const queue: Array<{ personId: string; generation: number }> = [{ personId: rootPersonId, generation: 0 }];

    while (queue.length > 0) {
      const current = queue.shift();
      if (!current) break;

      for (const nextPersonId of adjacency.get(current.personId) ?? []) {
        if (generations.has(nextPersonId)) continue;

        const nextGeneration = current.generation + generationStep;
        generations.set(nextPersonId, nextGeneration);
        queue.push({ personId: nextPersonId, generation: nextGeneration });
      }
    }

    return generations;
  }

  private buildAncestorAdjacency(relationships: DbRelationship[]) {
    const adjacency = new Map<string, string[]>();

    for (const relationship of relationships) {
      const direction = this.parentChildDirection(relationship);
      if (!direction) continue;
      this.push(adjacency, direction.childId, direction.parentId);
    }

    return adjacency;
  }

  private buildDescendantAdjacency(relationships: DbRelationship[]) {
    const adjacency = new Map<string, string[]>();

    for (const relationship of relationships) {
      const direction = this.parentChildDirection(relationship);
      if (!direction) continue;
      this.push(adjacency, direction.parentId, direction.childId);
    }

    return adjacency;
  }

  private buildUndirectedAdjacency(relationships: DbRelationship[]) {
    const adjacency = new Map<string, string[]>();

    for (const relationship of relationships) {
      this.push(adjacency, relationship.fromPersonId, relationship.toPersonId);
      this.push(adjacency, relationship.toPersonId, relationship.fromPersonId);
    }

    return adjacency;
  }

  private parentChildDirection(relationship: DbRelationship) {
    const type = relationship.type.toLowerCase();

    if (type === 'parent' || type === 'adoptive_parent') {
      return { parentId: relationship.fromPersonId, childId: relationship.toPersonId };
    }

    if (type === 'child' || type === 'adoptive_child') {
      return { parentId: relationship.toPersonId, childId: relationship.fromPersonId };
    }

    return null;
  }

  private toTreeNode(person: DbPerson, generation: number): TreePersonNode {
    return {
      id: person.id,
      personId: person.id,
      label: [person.givenName, person.familyName].filter(Boolean).join(' '),
      givenName: person.givenName,
      familyName: person.familyName,
      birthDate: person.birthDate?.toISOString() ?? null,
      deathDate: person.deathDate?.toISOString() ?? null,
      isLiving: person.isLiving,
      generation,
    };
  }

  private toTreeEdge(relationship: DbRelationship): TreeRelationshipEdge {
    const direction = this.parentChildDirection(relationship);

    return {
      id: relationship.id,
      source: direction?.parentId ?? relationship.fromPersonId,
      target: direction?.childId ?? relationship.toPersonId,
      type: relationship.type,
      label: this.relationshipLabel(relationship.type),
    };
  }

  private relationshipLabel(type: string) {
    const labels: Record<string, string> = {
      parent: 'родитель',
      child: 'ребёнок',
      spouse: 'супруги',
      sibling: 'сестра / брат',
      partner: 'партнёры',
      adoptive_parent: 'приёмный родитель',
      adoptive_child: 'приёмный ребёнок',
    };

    return labels[type.toLowerCase()] ?? type;
  }

  private push(adjacency: Map<string, string[]>, from: string, to: string) {
    const items = adjacency.get(from) ?? [];
    items.push(to);
    adjacency.set(from, items);
  }
}
