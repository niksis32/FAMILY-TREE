import { WikiArticlePage } from '@/features/wiki/wiki-article-page';

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <WikiArticlePage slug={slug} />;
}
