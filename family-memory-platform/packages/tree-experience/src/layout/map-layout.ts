import type { TreeViewDataResponse } from '@family/shared';
import { buildMapLayoutFromPayload, buildPersonRoutes } from '@family/map-engine';
import type { MapMarker, MapMigrationLine } from '@family/map-engine';

export type { MapMarker, MapMigrationLine };

export function buildMapLayout(data: TreeViewDataResponse): { markers: MapMarker[]; lines: MapMigrationLine[] } {
  const persons = data.nodes.map((node) => ({
    id: node.personId,
    label: node.label,
    generation: node.generation,
  }));

  const events = data.events.map((event) => {
    const place = event.placeId ? data.places.find((p) => p.id === event.placeId) : null;
    return {
      id: event.id,
      personId: event.personId,
      familyId: event.familyId,
      type: event.type,
      title: event.title,
      date: event.date,
      year: event.year,
      placeId: event.placeId,
      placeName: event.placeName,
      latitude: place?.latitude ?? null,
      longitude: place?.longitude ?? null,
    };
  });

  const places = data.places
    .filter((p) => p.latitude != null && p.longitude != null)
    .map((p) => ({
      id: p.id,
      name: p.name,
      latitude: p.latitude!,
      longitude: p.longitude!,
      country: p.country,
      region: p.region,
      city: p.city,
      eventIds: p.eventIds,
      personIds: p.personIds,
    }));

  const routes = buildPersonRoutes({ persons, events });
  return buildMapLayoutFromPayload({ places, events, routes });
}
