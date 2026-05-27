'use client';

import { useParams } from 'next/navigation';
import { StoryBuilder } from '@/features/family-stories/story-builder';

export default function EditStoryPage() {
  const params = useParams<{ id: string }>();
  return <StoryBuilder storyId={params.id} />;
}
