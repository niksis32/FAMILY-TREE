import { Suspense } from 'react';
import { CommunityGroupsCatalogPage } from '@/features/community/community-groups-catalog-page';

export default function CommunityGroupsPage() {
  return (
    <Suspense fallback={<p className="text-sm text-stone-500">Loading…</p>}>
      <CommunityGroupsCatalogPage />
    </Suspense>
  );
}
