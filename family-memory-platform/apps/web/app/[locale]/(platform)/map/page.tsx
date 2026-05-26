import { Suspense } from 'react';
import { HistoricalMapPage } from '@/features/historical-map/historical-map-page';

export default function MapRoutePage() {
  return (
    <Suspense fallback={<p className="text-sm text-stone-500">Loading map…</p>}>
      <HistoricalMapPage />
    </Suspense>
  );
}
