import { FamilyCard } from '@/components/domain';
import { PageHeader } from '@/components/ui';
import { families } from '@/lib/mock-data';

export default function FamiliesPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Семьи"
        description="Управление семейными линиями, поколениями и политиками приватности для отдельных веток древа."
      />
      <div className="grid gap-5 md:grid-cols-2">
        {families.map((family) => (
          <FamilyCard key={family.id} family={family} />
        ))}
      </div>
    </div>
  );
}
