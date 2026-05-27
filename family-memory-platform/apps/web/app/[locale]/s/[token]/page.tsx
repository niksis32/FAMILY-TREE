import type { Metadata } from 'next';
import { PublicStoryPage } from '@/features/family-stories/public-story-page';
import { API_PREFIX } from '@family/shared';

const apiBase = process.env.NEXT_PUBLIC_API_URL ?? `http://localhost:4000${API_PREFIX}`;

async function fetchPublicStory(token: string) {
  const res = await fetch(`${apiBase}/public/family-stories/token/${encodeURIComponent(token)}`, {
    cache: 'no-store',
  });
  if (!res.ok) return null;
  return res.json();
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const { token } = await params;
  const payload = await fetchPublicStory(token);
  if (!payload) return { title: 'Family story' };
  return {
    title: payload.title,
    description: payload.ogDescription ?? payload.narrativeText?.slice(0, 160),
    openGraph: {
      title: payload.title,
      description: payload.ogDescription ?? undefined,
      images: payload.coverUrl ? [{ url: payload.coverUrl }] : undefined,
    },
  };
}

export default async function PublicStoryRoutePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const payload = await fetchPublicStory(token);
  if (!payload) {
    return <p className="p-8 text-center text-stone-500">Story not found or link revoked.</p>;
  }
  const pdfHref = `${apiBase}/public/family-stories/token/${encodeURIComponent(token)}/pdf`;
  return <PublicStoryPage payload={payload} pdfHref={pdfHref} />;
}
