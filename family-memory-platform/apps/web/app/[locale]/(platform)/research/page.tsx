import { Suspense } from 'react';
import { GamificationDashboardPage } from '@/features/gamification/gamification-dashboard-page';

export default function ResearchRoutePage() {
  return (
    <Suspense fallback={<p className="text-sm text-stone-500">Loading research…</p>}>
      <GamificationDashboardPage />
    </Suspense>
  );
}
