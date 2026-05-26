import type { MapEvent } from '@family/shared';
import { eventHasCoordinates } from './person-route';

export interface EventMarkerFeature {
  eventId: string;
  personId?: string | null;
  type: string;
  title: string;
  year?: number | null;
  longitude: number;
  latitude: number;
  placeName?: string | null;
}

export function buildEventMarkers(events: MapEvent[]): EventMarkerFeature[] {
  return events
    .filter(eventHasCoordinates)
    .map((event) => ({
      eventId: event.id,
      personId: event.personId,
      type: event.type,
      title: event.title,
      year: event.year,
      longitude: event.longitude!,
      latitude: event.latitude!,
      placeName: event.placeName,
    }));
}

export const EVENT_MARKER_GLYPH: Record<string, string> = {
  BIRTH: '★',
  DEATH: '✝',
  MARRIAGE: '♥',
  DIVORCE: '✕',
  BURIAL: '⚰',
  RESIDENCE: '⌂',
  MIGRATION: '→',
  EDUCATION: '✎',
  MILITARY: '⚔',
  WORK: '⚒',
  OCCUPATION: '⚒',
  IMMIGRATION: '⇄',
  CUSTOM: '•',
};

export function eventMarkerGlyph(type: string): string {
  return EVENT_MARKER_GLYPH[type.toUpperCase()] ?? EVENT_MARKER_GLYPH.CUSTOM!;
}

export const EVENT_MARKER_COLOR: Record<string, string> = {
  BIRTH: '#2e6b4f',
  DEATH: '#4a5568',
  MARRIAGE: '#be123c',
  MILITARY: '#1e3a5f',
  WORK: '#8b4513',
  MIGRATION: '#c9a227',
  IMMIGRATION: '#0d9488',
  RESIDENCE: '#6b7280',
};

export function eventMarkerColor(type: string): string {
  return EVENT_MARKER_COLOR[type.toUpperCase()] ?? '#c9a227';
}
