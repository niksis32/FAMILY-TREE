import { notFound } from 'next/navigation';
import { PersonCard, PrivacyBadge, RelationshipBadge } from '@/components/domain';
import { Button, Card, PageHeader } from '@/components/ui';
import { persons, timelineEvents } from '@/lib/mock-data';

export default async function PersonDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const person = persons.find((item) => item.id === id);

  if (!person) {
    notFound();
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title={`${person.givenName} ${person.familyName ?? ''}`.trim()}
        description="Профиль персоны: ключевые данные, приватность, связи, документы, медиа и timeline жизни."
        action={<Button variant="secondary">Редактировать</Button>}
      />

      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <PersonCard person={person} />
        <Card>
          <div className="flex flex-wrap gap-3">
            <PrivacyBadge level="family" />
            <RelationshipBadge type="parent" />
            <RelationshipBadge type="spouse" />
          </div>
          <h2 className="mt-6 text-xl font-semibold">Биография</h2>
          <p className="mt-3 text-sm leading-6 text-stone-600 dark:text-slate-300">
            Здесь будет расширенная биография, медиа-воспоминания, подтверждающие документы и источники. Компонент готов для подключения `/persons/{id}`.
          </p>
        </Card>
      </div>

      <Card>
        <h2 className="text-xl font-semibold">События жизни</h2>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {timelineEvents.map((event) => (
            <div key={event.id} className="rounded-2xl border bg-stone-50 p-4 dark:bg-slate-950">
              <p className="text-sm font-semibold text-family-primary dark:text-family-accent">{event.date}</p>
              <p className="mt-2 text-sm">{event.title}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
