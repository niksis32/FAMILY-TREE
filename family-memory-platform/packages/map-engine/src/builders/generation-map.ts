import type { MapPayload, MapRoute } from '@family/shared';
import { routesForGeneration } from './family-migration';

export interface GenerationMapLayer {
  generation: number;
  label: string;
  routes: MapRoute[];
  opacity: number;
}

export function buildGenerationMapLayers(
  payload: Pick<MapPayload, 'generations' | 'routes'>,
  activeGeneration?: number | null,
): GenerationMapLayer[] {
  return payload.generations.map((band) => ({
    generation: band.generation,
    label: band.label,
    routes: routesForGeneration(payload.routes, band.generation),
    opacity: activeGeneration == null || activeGeneration === band.generation ? 1 : 0.35,
  }));
}

export function fadeOpacityForGeneration(
  bandGeneration: number,
  activeGeneration: number | null,
  minOpacity = 0.2,
): number {
  if (activeGeneration == null) return 1;
  if (bandGeneration === activeGeneration) return 1;
  const distance = Math.abs(bandGeneration - activeGeneration);
  return Math.max(minOpacity, 1 - distance * 0.25);
}
