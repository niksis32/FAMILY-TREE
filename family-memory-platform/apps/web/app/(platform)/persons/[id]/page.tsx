import { PersonDetailsWorkspace } from '@/components/person-details-workspace';
import { Button, Card, PageHeader } from '@/components/ui';

export default async function PersonDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Профиль персоны"
        description="Профиль персоны: ключевые данные, приватность, связи, документы, медиа и timeline жизни."
        action={<Button variant="secondary">Редактировать</Button>}
      />

      <PersonDetailsWorkspace id={id} />

      <Card>
        <h2 className="text-xl font-semibold">События жизни</h2>
        <p className="mt-3 text-sm text-stone-600 dark:text-slate-300">
          Timeline загружается на странице `/timeline` через real API endpoint `/timeline/person/:id`.
        </p>
      </Card>
    </div>
  );
}
