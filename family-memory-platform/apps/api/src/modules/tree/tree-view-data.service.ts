import { Injectable, NotFoundException } from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/current-user.decorator';
import { AccessControlService } from '../privacy/access-control.service';
import { PolicyEngineService } from '../privacy/policy-engine.service';
import type {
  TreeGenerationBand,
  TreeLayoutRole,
  TreeLineageFilter,
  TreeScopeMode,
  TreeViewDataQuery,
  TreeViewDataResponse,
  TreeViewEdge,
  TreeViewEvent,
  TreeViewFamily,
  TreeViewMediaPreview,
  TreeViewNode,
  TreeViewPlace,
} from '@family/shared';
import { getParentChildDirection, normalizeRelationshipType } from '@family/genealogy-core';
import { PrismaService } from '../../prisma/prisma.service';
import { MediaService } from '../media/media.service';

type DbRelationship = {
  id: string;
  fromPersonId: string;
  toPersonId: string;
  type: string;
};

type DbPerson = {
  id: string;
  givenName: string;
  familyName: string | null;
  gender: string | null;
  birthDate: Date | null;
  deathDate: Date | null;
  isLiving: boolean;
  privacyLevel: string;
  avatarMediaId: string | null;
};

const DEFAULT_DEPTH = 10;

@Injectable()
export class TreeViewDataService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly media: MediaService,
    private readonly access: AccessControlService,
    private readonly policy: PolicyEngineService,
  ) {}

  async getViewData(
    rootPersonId: string,
    query: TreeViewDataQuery = {},
    user?: AuthenticatedUser,
  ): Promise<TreeViewDataResponse> {
    const root = await this.prisma.person.findFirst({
      where: { id: rootPersonId, deletedAt: null },
      select: { id: true, workspaceId: true },
    });
    if (!root) {
      throw new NotFoundException('Root person not found');
    }

    const viewer = await this.access.viewerForWorkspace(user ?? null, root.workspaceId);
    const scope = query.scope ?? 'full';
    const depth = query.depth ?? DEFAULT_DEPTH;

    const personsById = await this.loadPersonMap(root.workspaceId);
    const relationships = (await this.prisma.relationship.findMany({
      where: { deletedAt: null },
      select: { id: true, fromPersonId: true, toPersonId: true, type: true },
    })).filter(
      (relationship) =>
        personsById.has(relationship.fromPersonId) && personsById.has(relationship.toPersonId),
    );
    const generations = this.collectGenerations(
      rootPersonId,
      relationships,
      personsById,
      scope,
      query.lineage ?? 'both',
      depth,
    );
    let personIds = [...generations.keys()];

    personIds = this.applyPersonFilters(personIds, personsById, generations, query);
    if (query.country?.trim()) {
      personIds = await this.filterByCountry(personIds, query.country.trim());
    }

    const personIdSet = new Set(personIds);
    const edges = relationships
      .filter((r) => personIdSet.has(r.fromPersonId) && personIdSet.has(r.toPersonId))
      .map((r) => this.toEdge(r));

    const spouseGroups = this.buildSpouseGroups(personIds, relationships, generations);
    const hideLiving = await this.resolveHideLiving(rootPersonId);
    const nodes = await this.buildNodes(
      personIds,
      personsById,
      generations,
      spouseGroups,
      rootPersonId,
      viewer,
      hideLiving,
    );

    const hiddenPersonIds = new Set(nodes.filter((node) => node.isHidden).map((node) => node.personId));

    const events = this.redactEventsForHiddenPersons(await this.loadEvents(personIds), hiddenPersonIds);
    const places = this.redactPlacesForHiddenPersons(
      await this.buildPlacesFromEvents(events, personIds),
      hiddenPersonIds,
    );
    const families = await this.loadFamilies(personIds);
    const mediaPreview = this.redactMediaForHiddenPersons(
      await this.loadMediaPreview(personIds, personsById, viewer, hideLiving),
      hiddenPersonIds,
    );
    const generationBands = this.buildGenerationBands(nodes);

    return {
      meta: {
        rootPersonId,
        scope,
        depth,
        generatedAt: new Date().toISOString(),
        filtersApplied: { scope, depth, ...query },
        nodeCount: nodes.length,
        edgeCount: edges.length,
      },
      nodes,
      edges,
      generations: generationBands,
      families,
      events,
      places,
      mediaPreview,
    };
  }

  toLegacyGraph(viewData: TreeViewDataResponse) {
    return {
      rootPersonId: viewData.meta.rootPersonId,
      mode: viewData.meta.scope,
      nodes: viewData.nodes.map((node) => ({
        id: node.id,
        personId: node.personId,
        label: node.label,
        givenName: node.givenName,
        familyName: node.familyName,
        birthDate: node.birthDate,
        deathDate: node.deathDate,
        isLiving: node.isLiving,
        generation: node.generation,
      })),
      edges: viewData.edges,
    };
  }

  private async loadPersonMap(workspaceId: string) {
    const rows = await this.prisma.person.findMany({
      where: { deletedAt: null, workspaceId },
      select: {
        id: true,
        givenName: true,
        familyName: true,
        gender: true,
        birthDate: true,
        deathDate: true,
        isLiving: true,
        privacyLevel: true,
        avatarMediaId: true,
      },
    });
    return new Map(rows.map((p) => [p.id, p as DbPerson]));
  }

  private async resolveHideLiving(rootPersonId: string): Promise<boolean> {
    const member = await this.prisma.familyMember.findFirst({
      where: { personId: rootPersonId, deletedAt: null },
      select: { familyId: true },
    });
    if (!member) return true;
    return this.access.familyHideLiving(member.familyId);
  }

  private collectGenerations(
    rootPersonId: string,
    relationships: DbRelationship[],
    personsById: Map<string, DbPerson>,
    scope: TreeScopeMode,
    lineage: TreeLineageFilter,
    depth: number,
  ) {
    const mode = scope === 'full' ? 'full' : scope;
    const generations = new Map<string, number>([[rootPersonId, 0]]);

    if (mode === 'ancestors' || mode === 'full') {
      this.walkDirected(
        rootPersonId,
        this.buildParentAdjacency(relationships, personsById, lineage, 'up'),
        generations,
        -1,
        depth,
      );
    }

    if (mode === 'descendants' || mode === 'full') {
      this.walkDirected(
        rootPersonId,
        this.buildParentAdjacency(relationships, personsById, lineage, 'down'),
        generations,
        1,
        depth,
      );
    }

    if (mode === 'full') {
      for (const relationship of relationships) {
        const type = normalizeRelationshipType(relationship.type);
        if (type === 'spouse' || type === 'partner' || type === 'sibling') {
          if (generations.has(relationship.fromPersonId)) {
            const gen = generations.get(relationship.fromPersonId)!;
            if (!generations.has(relationship.toPersonId)) {
              generations.set(relationship.toPersonId, gen);
            }
          }
          if (generations.has(relationship.toPersonId)) {
            const gen = generations.get(relationship.toPersonId)!;
            if (!generations.has(relationship.fromPersonId)) {
              generations.set(relationship.fromPersonId, gen);
            }
          }
        }
      }
    }

    return generations;
  }

  private walkDirected(
    rootPersonId: string,
    adjacency: Map<string, string[]>,
    generations: Map<string, number>,
    step: 1 | -1,
    maxDepth: number,
  ) {
    const queue: Array<{ personId: string; generation: number; depth: number }> = [
      { personId: rootPersonId, generation: 0, depth: 0 },
    ];

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (current.depth >= maxDepth) continue;

      for (const nextId of adjacency.get(current.personId) ?? []) {
        if (generations.has(nextId)) continue;
        const nextGen = current.generation + step;
        generations.set(nextId, nextGen);
        queue.push({ personId: nextId, generation: nextGen, depth: current.depth + 1 });
      }
    }
  }

  private buildParentAdjacency(
    relationships: DbRelationship[],
    personsById: Map<string, DbPerson>,
    lineage: TreeLineageFilter,
    direction: 'up' | 'down',
  ) {
    const adjacency = new Map<string, string[]>();

    for (const relationship of relationships) {
      const link = getParentChildDirection(relationship);
      if (!link) continue;

      const parentId = link.parentId;
      const childId = link.childId;
      const parent = personsById.get(parentId);
      const child = personsById.get(childId);

      if (lineage === 'paternal') {
        if (direction === 'up' && parent?.gender !== 'MALE') continue;
        if (direction === 'down' && child?.gender !== 'MALE') continue;
      }
      if (lineage === 'maternal') {
        if (direction === 'up' && parent?.gender !== 'FEMALE') continue;
        if (direction === 'down' && child?.gender !== 'FEMALE') continue;
      }

      if (direction === 'up') {
        this.pushAdj(adjacency, childId, parentId);
      } else {
        this.pushAdj(adjacency, parentId, childId);
      }
    }

    return adjacency;
  }

  private async filterByCountry(personIds: string[], country: string) {
    const wanted = country.toLowerCase();
    const events = await this.prisma.event.findMany({
      where: {
        deletedAt: null,
        personId: { in: personIds },
        place: { is: { country: { not: null } } },
      },
      include: { place: true },
    });

    const matched = new Set<string>();
    for (const event of events) {
      const placeCountry = event.place?.country?.toLowerCase() ?? '';
      if (placeCountry.includes(wanted) || wanted.includes(placeCountry)) {
        if (event.personId) matched.add(event.personId);
      }
    }

    if (matched.size === 0) {
      return personIds;
    }

    return personIds.filter((id) => matched.has(id));
  }

  private applyPersonFilters(
    personIds: string[],
    personsById: Map<string, DbPerson>,
    generations: Map<string, number>,
    query: TreeViewDataQuery,
  ) {
    return personIds.filter((id) => {
      const person = personsById.get(id);
      if (!person) return false;

      const gen = generations.get(id) ?? 0;
      if (query.generationMin !== undefined && gen < query.generationMin) return false;
      if (query.generationMax !== undefined && gen > query.generationMax) return false;

      if (query.surname?.trim()) {
        const wanted = query.surname.trim().toLowerCase();
        if ((person.familyName ?? '').toLowerCase() !== wanted) return false;
      }

      const birthYear = person.birthDate?.getFullYear();
      const deathYear = person.deathDate?.getFullYear();
      if (query.yearFrom !== undefined) {
        const end = deathYear ?? new Date().getFullYear();
        if (end < query.yearFrom) return false;
      }
      if (query.yearTo !== undefined) {
        const start = birthYear ?? deathYear;
        if (start !== undefined && start > query.yearTo) return false;
      }

      return true;
    });
  }

  private buildSpouseGroups(
    personIds: string[],
    relationships: DbRelationship[],
    generations: Map<string, number>,
  ) {
    const groups = new Map<string, string>();
    const idSet = new Set(personIds);
    let groupCounter = 0;

    for (const relationship of relationships) {
      const type = normalizeRelationshipType(relationship.type);
      if (type !== 'spouse' && type !== 'partner') continue;
      if (!idSet.has(relationship.fromPersonId) || !idSet.has(relationship.toPersonId)) continue;
      if (generations.get(relationship.fromPersonId) !== generations.get(relationship.toPersonId)) continue;

      const existing =
        groups.get(relationship.fromPersonId) ?? groups.get(relationship.toPersonId) ?? `sg-${++groupCounter}`;
      groups.set(relationship.fromPersonId, existing);
      groups.set(relationship.toPersonId, existing);
    }

    return groups;
  }

  private async buildNodes(
    personIds: string[],
    personsById: Map<string, DbPerson>,
    generations: Map<string, number>,
    spouseGroups: Map<string, string>,
    rootPersonId: string,
    viewer: ReturnType<AccessControlService['viewerFromUser']>,
    hideLivingPersons: boolean,
  ): Promise<TreeViewNode[]> {
    const familyMembers = await this.prisma.familyMember.findMany({
      where: { personId: { in: personIds }, deletedAt: null },
      select: { personId: true, familyId: true },
    });
    const familiesByPerson = new Map<string, string[]>();
    for (const member of familyMembers) {
      const list = familiesByPerson.get(member.personId) ?? [];
      list.push(member.familyId);
      familiesByPerson.set(member.personId, list);
    }

    const avatarUrls = new Map<string, string | null>();
    for (const id of personIds) {
      const person = personsById.get(id);
      if (person?.avatarMediaId) {
        try {
          const resolved = await this.media.createDownloadUrl(person.avatarMediaId);
          avatarUrls.set(id, resolved.downloadUrl);
        } catch {
          avatarUrls.set(id, null);
        }
      }
    }

    const nodes: TreeViewNode[] = [];
    for (const id of personIds) {
      const person = personsById.get(id);
      if (!person) continue;
      const generation = generations.get(id) ?? 0;
      const policyPerson = this.toPolicyPerson(person);
      const avatarUrl = avatarUrls.get(id) ?? null;
      const redacted = this.policy.applyTreeNodeRedaction(
        policyPerson,
        viewer,
        hideLivingPersons,
        avatarUrl,
      );
      nodes.push({
        id: person.id,
        personId: person.id,
        label: redacted.label,
        givenName: redacted.givenName,
        familyName: redacted.familyName,
        gender: person.gender,
        birthDate: redacted.birthDate,
        deathDate: redacted.deathDate,
        birthYear: redacted.birthYear,
        deathYear: redacted.deathYear,
        isLiving: redacted.isLiving,
        isHidden: redacted.isHidden,
        generation,
        layoutRole: this.resolveLayoutRole(id, rootPersonId, generation),
        spouseGroupId: spouseGroups.get(id) ?? null,
        familyIds: familiesByPerson.get(id) ?? [],
        avatarUrl: redacted.avatarUrl,
      });
    }
    return nodes.sort((a, b) => a.generation - b.generation || a.label.localeCompare(b.label, 'ru'));
  }

  private resolveLayoutRole(personId: string, rootPersonId: string, generation: number): TreeLayoutRole {
    if (personId === rootPersonId) return 'root';
    if (generation < 0) return 'ancestor';
    if (generation > 0) return 'descendant';
    return 'relative';
  }

  private async loadEvents(personIds: string[]): Promise<TreeViewEvent[]> {
    const rows = await this.prisma.event.findMany({
      where: {
        deletedAt: null,
        OR: [{ personId: { in: personIds } }, { familyId: { not: null } }],
      },
      include: { place: true },
      orderBy: { date: 'asc' },
      take: 500,
    });

    const idSet = new Set(personIds);
    return rows
      .filter((e) => !e.personId || idSet.has(e.personId))
      .map((e) => ({
        id: e.id,
        personId: e.personId,
        familyId: e.familyId,
        type: e.type,
        title: e.description?.slice(0, 80) || e.type,
        date: e.date?.toISOString() ?? null,
        year: e.date?.getFullYear() ?? null,
        placeId: e.placeId,
        placeName: e.place?.name ?? null,
      }));
  }

  private async buildPlacesFromEvents(events: TreeViewEvent[], personIds: string[]): Promise<TreeViewPlace[]> {
    const placeIds = [...new Set(events.map((e) => e.placeId).filter((id): id is string => Boolean(id)))];
    if (placeIds.length === 0) {
      return [];
    }

    const rows = await this.prisma.place.findMany({
      where: { id: { in: placeIds }, deletedAt: null },
    });

    const byId = new Map<string, TreeViewPlace>();
    for (const place of rows) {
      byId.set(place.id, {
        id: place.id,
        name: place.name,
        latitude: place.latitude,
        longitude: place.longitude,
        country: place.country,
        region: place.region,
        city: place.city,
        personIds: [],
        eventIds: [],
      });
    }

    for (const event of events) {
      if (!event.placeId) continue;
      const entry = byId.get(event.placeId);
      if (!entry) continue;
      if (event.personId && personIds.includes(event.personId) && !entry.personIds.includes(event.personId)) {
        entry.personIds.push(event.personId);
      }
      entry.eventIds.push(event.id);
    }

    return [...byId.values()];
  }

  private async loadFamilies(personIds: string[]): Promise<TreeViewFamily[]> {
    const members = await this.prisma.familyMember.findMany({
      where: { personId: { in: personIds }, deletedAt: null },
      include: { family: true },
    });

    const byFamily = new Map<string, TreeViewFamily>();
    for (const member of members) {
      if (member.family.deletedAt) continue;
      const entry =
        byFamily.get(member.familyId) ??
        ({
          id: member.familyId,
          name: member.family.name,
          memberIds: [],
          roles: {},
        } satisfies TreeViewFamily);
      if (!entry.memberIds.includes(member.personId)) {
        entry.memberIds.push(member.personId);
        entry.roles[member.personId] = member.role;
      }
      byFamily.set(member.familyId, entry);
    }

    return [...byFamily.values()];
  }

  private async loadMediaPreview(
    personIds: string[],
    personsById: Map<string, DbPerson>,
    viewer: ReturnType<AccessControlService['viewerFromUser']>,
    hideLivingPersons: boolean,
  ): Promise<TreeViewMediaPreview[]> {
    const mediaRows = await this.prisma.media.findMany({
      where: { personId: { in: personIds }, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: 80,
    });

    const previews: TreeViewMediaPreview[] = [];
    const seenPerson = new Set<string>();

    for (const personId of personIds) {
      const person = personsById.get(personId);
      if (!person) continue;

      const policyPerson = this.toPolicyPerson(person);
      if (!this.access.canViewPersonRecord(policyPerson, viewer, hideLivingPersons)) {
        continue;
      }

      if (person.avatarMediaId) {
        try {
          const resolved = await this.media.createDownloadUrl(person.avatarMediaId);
          previews.push({
            mediaId: person.avatarMediaId,
            personId,
            title: 'Avatar',
            mimeType: 'image/*',
            previewUrl: resolved.downloadUrl,
          });
          seenPerson.add(personId);
        } catch {
          /* skip */
        }
      }
    }

    for (const media of mediaRows) {
      if (!media.personId || seenPerson.has(media.personId)) continue;

      const person = media.personId ? personsById.get(media.personId) : undefined;
      const policyPerson = person ? this.toPolicyPerson(person) : null;
      if (policyPerson && !this.access.canViewPersonRecord(policyPerson, viewer, hideLivingPersons)) {
        continue;
      }
      if (
        !this.access.canViewMediaRecord(
          { id: media.id, privacyLevel: media.privacyLevel, personId: media.personId },
          viewer,
          policyPerson,
        )
      ) {
        continue;
      }

      try {
        const resolved = await this.media.createDownloadUrl(media.id);
        previews.push({
          mediaId: media.id,
          personId: media.personId,
          title: media.title,
          mimeType: media.mimeType,
          previewUrl: resolved.downloadUrl,
        });
        seenPerson.add(media.personId);
      } catch {
        /* skip */
      }
    }

    return previews;
  }

  private redactEventsForHiddenPersons(events: TreeViewEvent[], hiddenPersonIds: Set<string>): TreeViewEvent[] {
    return events.map((event) => {
      if (!event.personId || !hiddenPersonIds.has(event.personId)) {
        return event;
      }

      return {
        ...event,
        title: 'Restricted event',
        placeName: null,
      };
    });
  }

  private redactPlacesForHiddenPersons(places: TreeViewPlace[], hiddenPersonIds: Set<string>): TreeViewPlace[] {
    return places
      .map((place) => ({
        ...place,
        personIds: place.personIds.filter((personId) => !hiddenPersonIds.has(personId)),
      }))
      .filter((place) => place.personIds.length > 0 || place.eventIds.length > 0);
  }

  private redactMediaForHiddenPersons(
    previews: TreeViewMediaPreview[],
    hiddenPersonIds: Set<string>,
  ): TreeViewMediaPreview[] {
    return previews.filter((preview) => !preview.personId || !hiddenPersonIds.has(preview.personId));
  }

  private toPolicyPerson(person: DbPerson) {
    return {
      id: person.id,
      givenName: person.givenName,
      familyName: person.familyName,
      birthDate: person.birthDate?.toISOString() ?? null,
      deathDate: person.deathDate?.toISOString() ?? null,
      isLiving: person.isLiving,
      privacyLevel: person.privacyLevel.toLowerCase(),
    };
  }

  private buildGenerationBands(nodes: TreeViewNode[]): TreeGenerationBand[] {
    const grouped = new Map<number, string[]>();
    for (const node of nodes) {
      const list = grouped.get(node.generation) ?? [];
      list.push(node.personId);
      grouped.set(node.generation, list);
    }

    return [...grouped.entries()]
      .sort(([a], [b]) => a - b)
      .map(([generation, personIds]) => ({
        generation,
        label: generation === 0 ? 'Root generation' : generation > 0 ? `+${generation}` : String(generation),
        personIds,
      }));
  }

  private toEdge(relationship: DbRelationship): TreeViewEdge {
    const direction = getParentChildDirection(relationship);
    return {
      id: relationship.id,
      source: direction?.parentId ?? relationship.fromPersonId,
      target: direction?.childId ?? relationship.toPersonId,
      type: relationship.type,
      label: relationship.type,
    };
  }

  private pushAdj(adjacency: Map<string, string[]>, from: string, to: string) {
    const items = adjacency.get(from) ?? [];
    items.push(to);
    adjacency.set(from, items);
  }
}
