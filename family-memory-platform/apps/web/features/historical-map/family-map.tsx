'use client';

import type { MapPayload } from '@family/shared';
import { HistoricalMapCanvas } from './historical-map-canvas';
import { useHistoricalMapStore } from './use-historical-map-store';
import { cn } from '@/lib/utils';

export function FamilyMap({ payload }: { payload: MapPayload }) {
  const mode = useHistoricalMapStore((s) => s.mode);
  const activeGeneration = useHistoricalMapStore((s) => s.activeGeneration);
  const setActiveGeneration = useHistoricalMapStore((s) => s.setActiveGeneration);

  return (
    <div className="space-y-3">
      {mode === 'generation-map' && payload.generations.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setActiveGeneration(null)}
            className={cn(
              'rounded-full px-3 py-1 text-xs',
              activeGeneration == null ? 'bg-amber-800 text-amber-50' : 'bg-stone-100 text-stone-600',
            )}
          >
            All generations
          </button>
          {payload.generations.map((band) => (
            <button
              key={band.generation}
              type="button"
              onClick={() => setActiveGeneration(band.generation)}
              className={cn(
                'rounded-full px-3 py-1 text-xs',
                activeGeneration === band.generation
                  ? 'bg-amber-800 text-amber-50'
                  : 'bg-stone-100 text-stone-600 dark:bg-slate-800 dark:text-slate-300',
              )}
            >
              {band.label} ({band.personIds.length})
            </button>
          ))}
        </div>
      )}
      <HistoricalMapCanvas payload={payload} />
    </div>
  );
}
