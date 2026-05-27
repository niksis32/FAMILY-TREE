'use client';

import { useParams } from 'next/navigation';
import { CommunityThreadPage } from '@/features/community/community-thread-page';

export default function CommunityThreadRoutePage() {
  const params = useParams();
  const threadId = params.id as string;
  return <CommunityThreadPage threadId={threadId} />;
}
