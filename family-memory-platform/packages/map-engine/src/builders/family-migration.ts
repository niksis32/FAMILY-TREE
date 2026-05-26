import type { MapEvent, MapPayload, MapRoute } from '@family/shared';
import { buildPersonRoutes } from './person-route';

export function buildFamilyMigration(payload: Pick<MapPayload, 'persons' | 'events'>): MapRoute[] {
  return buildPersonRoutes(payload);
}

export function routesForGeneration(routes: MapRoute[], generation: number): MapRoute[] {
  return routes.filter((route) => (route.generation ?? 0) === generation);
}

export function eventsForPerson(events: MapEvent[], personId: string): MapEvent[] {
  return events.filter((e) => e.personId === personId);
}

export function mergeRouteCoordinates(routes: MapRoute[]): [number, number][] {
  const merged: [number, number][] = [];
  for (const route of routes) {
    for (const coord of route.coordinates) {
      const prev = merged[merged.length - 1];
      if (prev && prev[0] === coord[0] && prev[1] === coord[1]) continue;
      merged.push(coord);
    }
  }
  return merged;
}
