import Link from 'next/link';
import { PageHeader, StatCard, Button, Card } from '@/components/ui';
import { documents, families, mediaItems, persons, timelineEvents } from '@/lib/mock-data';

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Панель семейной памяти"
        description="Единая точка управления семейным древом, медиаархивом, документами, timeline и будущими AI-модулями."
        action={
          <Link href="/persons">
            <Button>Добавить персону</Button>
          </Link>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Персоны" value={String(persons.length)} hint="готово к подключению /persons API" />
        <StatCard label="Семьи" value={String(families.length)} hint="линии и приватность" />
        <StatCard label="Медиа" value={String(mediaItems.length)} hint="MinIO upload pipeline" />
        <StatCard label="События" value={String(timelineEvents.length + documents.length)} hint="timeline + архивы" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
        <Card>
          <h2 className="text-xl font-semibold">Следующие шаги MVP</h2>
          <div className="mt-5 grid gap-3">
            {['Подключить JWT/RBAC к backend', 'Заменить mock-данные на API responses', 'Добавить upload flow для MinIO', 'Расширить TreeCanvas relationship graph'].map((item) => (
              <div key={item} className="rounded-2xl border bg-stone-50 p-4 text-sm dark:bg-slate-950">
                {item}
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <h2 className="text-xl font-semibold">Premium UI</h2>
          <p className="mt-4 text-sm leading-6 text-stone-600 dark:text-slate-300">
            Dashboard layout, sidebar, protected routes, тема и shadcn-like primitives уже собраны как основа для дальнейшей бизнес-логики.
          </p>
        </Card>
      </div>
    </div>
  );
}
