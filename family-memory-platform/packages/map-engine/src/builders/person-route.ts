import type { MapBounds, MapEvent, MapPayload, MapPlace, MapRoute, MapRouteStop } from '@family/shared';

const ROUTE_EVENT_TYPES = new Set([
  'BIRTH',
  'DEATH',
  'MARRIAGE',
  'DIVORCE',
  'BURIAL',
  'RESIDENCE',
  'MIGRATION',
  'EDUCATION',
  'MILITARY',
  'WORK',
  'OCCUPATION',
  'IMMIGRATION',
]);

const PERSON_COLORS = [
  '#c9a227',
  '#8b4513',
  '#2e6b4f',
  '#4a5568',
  '#7c3aed',
  '#b45309',
  '#0d9488',
  '#be123c',
];

export function personRouteColor(personId: string, index = 0): string {
  let hash = index;
  for (let i = 0; i < personId.length; i += 1) {
    hash = (hash + personId.charCodeAt(i) * (i + 1)) % PERSON_COLORS.length;
  }
  return PERSON_COLORS[hash] ?? PERSON_COLORS[0]!;
}

export function eventHasCoordinates(event: MapEvent): boolean {
  return event.latitude != null && event.longitude != null;
}

export function computeMapBounds(places: MapPlace[]): MapBounds | null {
  if (places.length === 0) return null;
  let west = Infinity;
  let south = Infinity;
  let east = -Infinity;
  let north = -Infinity;
  for (const place of places) {
    west = Math.min(west, place.longitude);
    south = Math.min(south, place.latitude);
    east = Math.max(east, place.longitude);
    north = Math.max(north, place.latitude);
  }
  return { west, south, east, north };
}

export function filterEventsByYear(events: MapEvent[], yearFrom?: number, yearTo?: number): MapEvent[] {
  return events.filter((event) => {
    if (event.year == null) return true;
    if (yearFrom != null && event.year < yearFrom) return false;
    if (yearTo != null && event.year > yearTo) return false;
    return true;
  });
}

export function filterEventsByTypes(events: MapEvent[], eventTypes?: string[]): MapEvent[] {
  if (!eventTypes?.length) return events;
  const allowed = new Set(eventTypes.map((t) => t.toUpperCase()));
  return events.filter((event) => allowed.has(event.type.toUpperCase()));
}

export function buildPersonRoute(
  personId: string,
  personLabel: string,
  events: MapEvent[],
  options?: { generation?: number | null; colorIndex?: number },
): MapRoute | null {
  const routeEvents = events
    .filter((e) => e.personId === personId && eventHasCoordinates(e) && ROUTE_EVENT_TYPES.has(e.type.toUpperCase()))
    .sort((a, b) => {
      const ya = a.year ?? 9999;
      const yb = b.year ?? 9999;
      if (ya !== yb) return ya - yb;
      return (a.sequence ?? 0) - (b.sequence ?? 0);
    });

  if (routeEvents.length === 0) return null;

  const stops: MapRouteStop[] = routeEvents.map((event, index) => ({
    eventId: event.id,
    order: index + 1,
    longitude: event.longitude!,
    latitude: event.latitude!,
    year: event.year,
    label: event.title,
    type: event.type,
  }));

  const coordinates: [number, number][] = stops.map((s) => [s.longitude, s.latitude]);

  return {
    id: `route-${personId}`,
    personId,
    personLabel,
    generation: options?.generation ?? null,
    color: personRouteColor(personId, options?.colorIndex ?? 0),
    coordinates,
    stops,
  };
}

export function buildPersonRoutes(
  payload: Pick<MapPayload, 'persons' | 'events'>,
  personIds?: string[],
): MapRoute[] {
  const ids = personIds ?? payload.persons.map((p) => p.id);
  const routes: MapRoute[] = [];
  ids.forEach((personId, index) => {
    const person = payload.persons.find((p) => p.id === personId);
    const route = buildPersonRoute(personId, person?.label ?? personId, payload.events, {
      generation: person?.generation,
      colorIndex: index,
    });
    if (route) routes.push(route);
  });
  return routes;
}

export interface MapMarker {
  placeId: string;
  name: string;
  latitude: number;
  longitude: number;
  personIds: string[];
}

export interface MapMigrationLine {
  id: string;
  coordinates: [number, number][];
  personId?: string | null;
}

export function buildMapLayoutFromPayload(payload: Pick<MapPayload, 'places' | 'events' | 'routes'>) {
  const markers: MapMarker[] = payload.places.map((place) => ({
    placeId: place.id,
    name: place.displayName ?? place.name,
    latitude: place.latitude,
    longitude: place.longitude,
    personIds: place.personIds,
  }));

  const lines: MapMigrationLine[] = payload.routes.map((route) => ({
    id: route.id,
    coordinates: route.coordinates,
    personId: route.personId,
  }));

  return { markers, lines };
}

export function enrichPayloadRoutes(payload: MapPayload): MapPayload {
  const routes = buildPersonRoutes(payload);
  const generations = buildGenerationBands(payload.persons, routes);
  const bounds = computeMapBounds(payload.places);
  return {
    ...payload,
    routes,
    generations,
    meta: { ...payload.meta, bounds },
  };
}

export function buildGenerationBands(
  persons: MapPayload['persons'],
  routes: MapRoute[],
): MapPayload['generations'] {
  const byGen = new Map<number, { personIds: string[]; routeIds: string[] }>();
  for (const person of persons) {
    const gen = person.generation ?? 0;
    const entry = byGen.get(gen) ?? { personIds: [], routeIds: [] };
    entry.personIds.push(person.id);
    byGen.set(gen, entry);
  }
  for (const route of routes) {
    const gen = route.generation ?? 0;
    const entry = byGen.get(gen) ?? { personIds: [], routeIds: [] };
    if (!entry.routeIds.includes(route.id)) entry.routeIds.push(route.id);
    byGen.set(gen, entry);
  }
  return [...byGen.entries()]
    .sort(([a], [b]) => a - b)
    .map(([generation, data]) => ({
      generation,
      label: generation === 0 ? 'Root generation' : generation < 0 ? `Gen ${generation}` : `Gen +${generation}`,
      personIds: data.personIds,
      routeIds: data.routeIds,
    }));
}

export function getAnimationCoordinateAtProgress(
  route: MapRoute,
  progress: number,
): [number, number] | null {
  if (route.coordinates.length === 0) return null;
  if (route.coordinates.length === 1) return route.coordinates[0]!;
  const clamped = Math.max(0, Math.min(1, progress));
  const totalSegments = route.coordinates.length - 1;
  const scaled = clamped * totalSegments;
  const segmentIndex = Math.min(Math.floor(scaled), totalSegments - 1);
  const segmentProgress = scaled - segmentIndex;
  const from = route.coordinates[segmentIndex]!;
  const to = route.coordinates[segmentIndex + 1]!;
  return [
    from[0] + (to[0] - from[0]) * segmentProgress,
    from[1] + (to[1] - from[1]) * segmentProgress,
  ];
}

export function activeStopAtProgress(route: MapRoute, progress: number): MapRouteStop | null {
  if (route.stops.length === 0) return null;
  const index = Math.min(route.stops.length - 1, Math.floor(progress * route.stops.length));
  return route.stops[index] ?? null;
}
