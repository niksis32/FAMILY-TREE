import { Injectable, NotFoundException } from '@nestjs/common';
import type {
  MapEvent,
  MapHistoricalAlias,
  MapPayload,
  MapPersonSummary,
  MapPlace,
  MapQuery,
  MigrationPathQuery,
} from '@family/shared';
import {
  buildGenerationBands,
  buildPersonRoutes,
  computeMapBounds,
  filterEventsByTypes,
  filterEventsByYear,
  resolveHistoricalName,
} from '@family/map-engine';
import { PrismaService } from '../../prisma/prisma.service';
import { TreeViewDataService } from '../tree/tree-view-data.service';

type DbEvent = {
  id: string;
  type: string;
  date: Date | null;
  description: string | null;
  personId: string | null;
  familyId: string | null;
  placeId: string | null;
  place: {
    id: string;
    name: string;
    latitude: number | null;
    longitude: number | null;
    country: string | null;
    region: string | null;
    city: string | null;
    geoCityId: string | null;
    geoCity: {
      id: string;
      name: string;
      latitude: number | null;
      longitude: number | null;
      aliases: Array<{
        id: string;
        cityId: string;
        oldName: string;
        fromYear: number | null;
        toYear: number | null;
      }>;
    } | null;
  } | null;
};

@Injectable()
export class MapService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly treeViewData: TreeViewDataService,
  ) {}

  async getPersonMap(personId: string, query: MapQuery = {}): Promise<MapPayload> {
    await this.ensurePerson(personId);
    const persons = await this.loadPersonSummaries([personId]);
    return this.buildPayload('person', personId, persons, query);
  }

  async getFamilyMap(familyId: string, query: MapQuery = {}): Promise<MapPayload> {
    const family = await this.prisma.family.findFirst({
      where: { id: familyId, deletedAt: null },
      include: { members: { where: { deletedAt: null }, select: { personId: true } } },
    });
    if (!family) throw new NotFoundException('Family not found');

    const personIds = family.members.map((m) => m.personId);
    const persons = await this.loadPersonSummaries(personIds);
    return this.buildPayload('family', familyId, persons, query);
  }

  async getTreeMap(treeId: string, query: MapQuery = {}): Promise<MapPayload> {
    const viewData = await this.treeViewData.getViewData(treeId, {
      scope: query.scope ?? 'full',
      depth: query.depth ?? 10,
      generationMin: query.generationMin,
      generationMax: query.generationMax,
      yearFrom: query.yearFrom,
      yearTo: query.yearTo,
    });

    const persons: MapPersonSummary[] = viewData.nodes.map((node) => ({
      id: node.personId,
      label: node.label,
      generation: node.generation,
    }));

    return this.buildPayload('tree', treeId, persons, query, persons.map((p) => p.id), viewData.events);
  }

  async getMigrationPath(query: MigrationPathQuery): Promise<MapPayload> {
    const personIds = [...new Set(query.personIds.filter(Boolean))];
    if (personIds.length === 0) {
      return this.emptyPayload('migration-path', 'none', query);
    }
    const persons = await this.loadPersonSummaries(personIds);
    return this.buildPayload('migration-path', personIds.join(','), persons, query, personIds);
  }

  private async buildPayload(
    sourceType: MapPayload['meta']['sourceType'],
    sourceId: string,
    persons: MapPersonSummary[],
    query: MapQuery,
    personIds?: string[],
    preloadedEvents?: Array<{
      id: string;
      personId?: string | null;
      familyId?: string | null;
      type: string;
      title: string;
      date?: string | null;
      year?: number | null;
      placeId?: string | null;
      placeName?: string | null;
    }>,
  ): Promise<MapPayload> {
    const ids = personIds ?? persons.map((p) => p.id);
    let events = preloadedEvents
      ? await this.hydrateViewEvents(preloadedEvents, query.includeHistoricalNames)
      : await this.loadEvents(ids, query.includeHistoricalNames);

    events = filterEventsByYear(events, query.yearFrom, query.yearTo);
    events = filterEventsByTypes(events, query.eventTypes);

    if (query.generationMin != null || query.generationMax != null) {
      const allowed = new Set(
        persons
          .filter((p) => {
            const g = p.generation ?? 0;
            if (query.generationMin != null && g < query.generationMin) return false;
            if (query.generationMax != null && g > query.generationMax) return false;
            return true;
          })
          .map((p) => p.id),
      );
      events = events.filter((e) => !e.personId || allowed.has(e.personId));
      persons = persons.filter((p) => allowed.has(p.id));
    }

    const places = this.buildPlacesFromEvents(events);
    const historicalAliases = query.includeHistoricalNames ? await this.loadHistoricalAliases(places) : [];

    const routes = buildPersonRoutes({ persons, events });
    const generations = buildGenerationBands(persons, routes);
    const bounds = computeMapBounds(places);
    const years = events.map((e) => e.year).filter((y): y is number => y != null);

    return {
      meta: {
        sourceType,
        sourceId,
        generatedAt: new Date().toISOString(),
        yearRange: {
          min: years.length ? Math.min(...years) : null,
          max: years.length ? Math.max(...years) : null,
        },
        eventCount: events.length,
        placeCount: places.length,
        bounds,
        filtersApplied: query,
      },
      persons,
      places,
      events,
      routes,
      generations,
      historicalAliases,
    };
  }

  private emptyPayload(sourceType: MapPayload['meta']['sourceType'], sourceId: string, query: MapQuery): MapPayload {
    return {
      meta: {
        sourceType,
        sourceId,
        generatedAt: new Date().toISOString(),
        yearRange: { min: null, max: null },
        eventCount: 0,
        placeCount: 0,
        bounds: null,
        filtersApplied: query,
      },
      persons: [],
      places: [],
      events: [],
      routes: [],
      generations: [],
      historicalAliases: [],
    };
  }

  private async ensurePerson(personId: string) {
    const person = await this.prisma.person.findFirst({ where: { id: personId, deletedAt: null } });
    if (!person) throw new NotFoundException('Person not found');
  }

  private async loadPersonSummaries(personIds: string[]): Promise<MapPersonSummary[]> {
    if (personIds.length === 0) return [];
    const rows = await this.prisma.person.findMany({
      where: { id: { in: personIds }, deletedAt: null },
      select: { id: true, givenName: true, familyName: true },
    });
    return rows.map((p) => ({
      id: p.id,
      label: [p.givenName, p.familyName].filter(Boolean).join(' '),
      generation: null,
    }));
  }

  private async hydrateViewEvents(
    events: Array<{
      id: string;
      personId?: string | null;
      familyId?: string | null;
      type: string;
      title: string;
      date?: string | null;
      year?: number | null;
      placeId?: string | null;
      placeName?: string | null;
    }>,
    includeHistoricalNames?: boolean,
  ): Promise<MapEvent[]> {
    const placeIds = [...new Set(events.map((e) => e.placeId).filter((id): id is string => Boolean(id)))];
    const places = placeIds.length
      ? await this.prisma.place.findMany({
          where: { id: { in: placeIds }, deletedAt: null },
          include: { geoCity: { include: { aliases: true } } },
        })
      : [];
    const placeById = new Map(places.map((p) => [p.id, p]));

    return events.map((event, index) => {
      const place = event.placeId ? placeById.get(event.placeId) ?? null : null;
      const coords = this.resolveCoordinates(place);
      const historicalName =
        includeHistoricalNames && place?.geoCity?.aliases?.length
          ? resolveHistoricalName(
              place.geoCity.aliases.map((a) => ({
                id: a.id,
                cityId: a.cityId,
                cityName: place.geoCity!.name,
                oldName: a.oldName,
                fromYear: a.fromYear,
                toYear: a.toYear,
                latitude: place.geoCity!.latitude,
                longitude: place.geoCity!.longitude,
              })),
              place.geoCityId,
              event.year,
            )
          : null;

      return {
        id: event.id,
        personId: event.personId,
        familyId: event.familyId,
        type: event.type,
        title: event.title,
        date: event.date,
        year: event.year,
        placeId: event.placeId,
        placeName: historicalName ?? event.placeName ?? place?.name ?? null,
        latitude: coords?.latitude ?? null,
        longitude: coords?.longitude ?? null,
        sequence: index,
      };
    });
  }

  private async loadEvents(personIds: string[], includeHistoricalNames?: boolean): Promise<MapEvent[]> {
    const rows = await this.prisma.event.findMany({
      where: { deletedAt: null, personId: { in: personIds } },
      include: {
        place: { include: { geoCity: { include: { aliases: true } } } },
      },
      orderBy: { date: 'asc' },
      take: 1000,
    });

    return rows.map((event, index) => this.toMapEvent(event as DbEvent, index, includeHistoricalNames));
  }

  private toMapEvent(event: DbEvent, sequence: number, includeHistoricalNames?: boolean): MapEvent {
    const coords = this.resolveCoordinates(event.place);
    const year = event.date?.getFullYear() ?? null;
    let placeName = event.place?.name ?? null;

    if (includeHistoricalNames && event.place?.geoCity?.aliases?.length) {
      const alias = resolveHistoricalName(
        event.place.geoCity.aliases.map((a) => ({
          id: a.id,
          cityId: a.cityId,
          cityName: event.place!.geoCity!.name,
          oldName: a.oldName,
          fromYear: a.fromYear,
          toYear: a.toYear,
          latitude: event.place!.geoCity!.latitude,
          longitude: event.place!.geoCity!.longitude,
        })),
        event.place.geoCityId,
        year,
      );
      if (alias) placeName = alias;
    }

    return {
      id: event.id,
      personId: event.personId,
      familyId: event.familyId,
      type: event.type,
      title: event.description?.slice(0, 120) || event.type,
      description: event.description,
      date: event.date?.toISOString() ?? null,
      year,
      placeId: event.placeId,
      placeName,
      latitude: coords?.latitude ?? null,
      longitude: coords?.longitude ?? null,
      sequence,
    };
  }

  private resolveCoordinates(
    place: DbEvent['place'],
  ): { latitude: number; longitude: number } | null {
    if (!place) return null;
    if (place.latitude != null && place.longitude != null) {
      return { latitude: place.latitude, longitude: place.longitude };
    }
    if (place.geoCity?.latitude != null && place.geoCity.longitude != null) {
      return { latitude: place.geoCity.latitude, longitude: place.geoCity.longitude };
    }
    return null;
  }

  private buildPlacesFromEvents(events: MapEvent[]): MapPlace[] {
    const byId = new Map<string, MapPlace>();
    for (const event of events) {
      if (!event.placeId || event.latitude == null || event.longitude == null) continue;
      let place = byId.get(event.placeId);
      if (!place) {
        place = {
          id: event.placeId,
          name: event.placeName ?? event.placeId,
          displayName: event.placeName ?? undefined,
          latitude: event.latitude,
          longitude: event.longitude,
          eventIds: [],
          personIds: [],
        };
        byId.set(event.placeId, place);
      }
      place.eventIds.push(event.id);
      if (event.personId && !place.personIds.includes(event.personId)) {
        place.personIds.push(event.personId);
      }
    }
    return [...byId.values()];
  }

  private async loadHistoricalAliases(places: MapPlace[]): Promise<MapHistoricalAlias[]> {
    const placeRows = await this.prisma.place.findMany({
      where: { id: { in: places.map((p) => p.id) }, deletedAt: null },
      select: { geoCityId: true },
    });
    const cityIds = [...new Set(placeRows.map((p) => p.geoCityId).filter((id): id is string => Boolean(id)))];
    if (cityIds.length === 0) return [];

    const aliases = await this.prisma.historicalPlaceAlias.findMany({
      where: { cityId: { in: cityIds } },
      include: { city: { select: { id: true, name: true, latitude: true, longitude: true } } },
      take: 500,
    });

    return aliases.map((a) => ({
      id: a.id,
      cityId: a.cityId,
      cityName: a.city.name,
      oldName: a.oldName,
      fromYear: a.fromYear,
      toYear: a.toYear,
      latitude: a.city.latitude,
      longitude: a.city.longitude,
    }));
  }
}
