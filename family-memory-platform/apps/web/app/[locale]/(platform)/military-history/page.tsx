import { Suspense } from 'react';
import { MilitaryHistoryPage } from '@/features/military-history/military-history-page';

export default function MilitaryHistoryRoutePage() {
  return (
    <Suspense fallback={<p className="text-sm text-stone-500">Loading military history…</p>}>
      <MilitaryHistoryPage />
    </Suspense>
  );
}
