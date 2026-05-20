import { PersonsWorkspace } from '@/components/persons-workspace';
import { PageHeader } from '@/components/ui';

export default function PersonsPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Люди"
        description="Каталог персон с базовой карточкой, биографией, датами жизни и будущими связями genealogy graph."
      />
      <PersonsWorkspace />
    </div>
  );
}
