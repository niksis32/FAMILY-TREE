'use client';

import type { MapPayload } from '@family/shared';
import { FamilyMap } from '@/features/historical-map/family-map';

export function StoryMap({ payload }: { payload: MapPayload | null | undefined }) {
  if (!payload?.events?.length) return null;
  return (
    <div className="overflow-hidden rounded-3xl border bg-white shadow-premium dark:border-slate-800 dark:bg-slate-900">
      <div className="h-[420px]">
        <FamilyMap payload={payload} />
      </div>
    </div>
  );
}
