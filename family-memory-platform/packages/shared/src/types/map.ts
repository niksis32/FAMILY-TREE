import type { TreeScopeMode } from './tree-view';

export type MapSourceType = 'person' | 'family' | 'tree' | 'migration-path';

export interface MapQuery {
  yearFrom?: number;
  yearTo?: number;
  eventTypes?: string[];
  includeHistoricalNames?: boolean;
  scope?: TreeScopeMode;
  depth?: number;
  generationMin?: number;
  generationMax?: number;
}

export interface MapBounds {
  west: number;
  south: number;
  east: number;
  north: number;
}

export interface MapPlace {
  id: string;
  name: string;
  displayName?: string;
  latitude: number;
  longitude: number;
  country?: string | null;
  region?: string | null;
  city?: string | null;
  historicalName?: string | null;
  eventIds: string[];
  personIds: string[];
}

export interface MapEvent {
  id: string;
  personId?: string | null;
  familyId?: string | null;
  type: string;
  title: string;
  description?: string | null;
  date?: string | null;
  year?: number | null;
  placeId?: string | null;
  placeName?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  sequence?: number;
}

export interface MapRouteStop {
  eventId: string;
  order: number;
  longitude: number;
  latitude: number;
  year?: number | null;
  label: string;
  type: string;
}

export interface MapRoute {
  id: string;
  personId: string;
  personLabel: string;
  generation?: number | null;
  color?: string;
  coordinates: [number, number][];
  stops: MapRouteStop[];
}

export interface MapGenerationBand {
  generation: number;
  label: string;
  personIds: string[];
  routeIds: string[];
}

export interface MapHistoricalAlias {
  id: string;
  cityId: string;
  cityName: string;
  oldName: string;
  fromYear?: number | null;
  toYear?: number | null;
  latitude?: number | null;
  longitude?: number | null;
}

export interface MapPersonSummary {
  id: string;
  label: string;
  generation?: number | null;
}

export interface MapPayloadMeta {
  sourceType: MapSourceType;
  sourceId: string;
  generatedAt: string;
  yearRange: { min: number | null; max: number | null };
  eventCount: number;
  placeCount: number;
  bounds: MapBounds | null;
  filtersApplied: MapQuery;
}

export interface MapPayload {
  meta: MapPayloadMeta;
  persons: MapPersonSummary[];
  places: MapPlace[];
  events: MapEvent[];
  routes: MapRoute[];
  generations: MapGenerationBand[];
  historicalAliases: MapHistoricalAlias[];
}

export interface MigrationPathQuery {
  personIds: string[];
  yearFrom?: number;
  yearTo?: number;
  eventTypes?: string[];
  includeHistoricalNames?: boolean;
}

export type HistoricalMapMode =
  | 'person-route'
  | 'family-migration'
  | 'generation-map'
  | 'events-map'
  | 'historical-places';
