import { Cemetery3DViewer } from '@/features/integrations/cemetery-3d-viewer';

type PageProps = {
  params: Promise<{ burialSiteId: string }>;
};

export default async function Cemetery3DRoutePage({ params }: PageProps) {
  const { burialSiteId } = await params;
  return <Cemetery3DViewer burialSiteId={burialSiteId} />;
}
