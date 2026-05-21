import { FamilyDetailsWorkspace } from '@/components/family-details-workspace';

export default async function FamilyDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <FamilyDetailsWorkspace id={id} />;
}
