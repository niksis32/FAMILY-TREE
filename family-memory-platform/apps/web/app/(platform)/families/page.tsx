import { FamiliesWorkspace } from '@/components/families-workspace';
import { PageHeader } from '@/components/ui';

export default function FamiliesPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Семьи"
        description="Управление семейными линиями, поколениями и политиками приватности для отдельных веток древа."
      />
      <FamiliesWorkspace />
    </div>
  );
}
