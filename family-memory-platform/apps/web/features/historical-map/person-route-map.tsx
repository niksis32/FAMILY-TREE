'use client';

import type { MapPayload } from '@family/shared';
import { HistoricalMapCanvas } from './historical-map-canvas';

export function PersonRouteMap({ payload }: { payload: MapPayload }) {
  return <HistoricalMapCanvas payload={payload} />;
}

export function PersonRouteMapLite({ payload }: { payload: MapPayload }) {
  return <HistoricalMapCanvas payload={payload} lite />;
}
