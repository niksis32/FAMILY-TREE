import type { TreeViewDataResponse } from '@family/shared';

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

export function buildMapLayout(data: TreeViewDataResponse) {
  const markers: MapMarker[] = data.places
    .filter((place) => place.latitude != null && place.longitude != null)
    .map((place) => ({
      placeId: place.id,
      name: place.name,
      latitude: place.latitude!,
      longitude: place.longitude!,
      personIds: place.personIds,
    }));

  const lines: MapMigrationLine[] = [];
  const eventsByPerson = new Map<string, typeof data.events>();

  for (const event of data.events) {
    if (!event.personId) continue;
    const list = eventsByPerson.get(event.personId) ?? [];
    list.push(event);
    eventsByPerson.set(event.personId, list);
  }

  for (const [personId, events] of eventsByPerson) {
    const migrationEvents = events
      .filter((e) => ['MIGRATION', 'RESIDENCE', 'IMMIGRATION'].includes(e.type))
      .sort((a, b) => (a.year ?? 0) - (b.year ?? 0));

    const coordinates: [number, number][] = [];
    for (const event of migrationEvents) {
      if (!event.placeId) continue;
      const place = data.places.find((p) => p.id === event.placeId);
      if (place?.latitude != null && place.longitude != null) {
        coordinates.push([place.longitude, place.latitude]);
      }
    }

    if (coordinates.length >= 2) {
      lines.push({ id: `migration-${personId}`, coordinates, personId });
    }
  }

  return { markers, lines };
}
