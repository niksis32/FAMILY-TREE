import { DocumentIntelligencePage } from '@/features/document-intelligence/document-intelligence-page';

export default async function DocumentIntelligenceRoutePage({
  params,
}: {
  params: Promise<{ locale: string; documentId: string }>;
}) {
  const { documentId } = await params;
  return <DocumentIntelligencePage documentId={documentId} />;
}
