'use client';

import { useParams } from 'next/navigation';
import { CommunityGroupThreadsPage } from '@/features/community/community-group-threads-page';

export default function CommunityGroupDetailPage() {
  const params = useParams();
  const groupId = params.groupId as string;
  return <CommunityGroupThreadsPage groupId={groupId} />;
}
