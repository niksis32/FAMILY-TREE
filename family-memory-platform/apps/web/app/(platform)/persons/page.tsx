import { PersonCard, PersonForm } from '@/components/domain';
import { PageHeader } from '@/components/ui';
import { persons } from '@/lib/mock-data';

export default function PersonsPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Люди"
        description="Каталог персон с базовой карточкой, биографией, датами жизни и будущими связями genealogy graph."
      />
      <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <div className="grid gap-4 md:grid-cols-2">
          {persons.map((person) => (
            <PersonCard key={person.id} person={person} />
          ))}
        </div>
        <PersonForm />
      </div>
    </div>
  );
}
