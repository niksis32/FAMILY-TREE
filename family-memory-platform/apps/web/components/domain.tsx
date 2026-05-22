'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import type { PersonSummary, RelationshipType } from '@family/shared';
import { Badge, Button, Card, Input, Select, Textarea } from '@/components/ui';
import type { DocumentItem, FamilySummary, MediaItem, PrivacyLevel, TimelineEvent } from '@/lib/mock-data';

function fullName(person: Pick<PersonSummary, 'givenName' | 'patronymic' | 'familyName'>) {
  return [person.givenName, person.patronymic, person.familyName].filter(Boolean).join(' ');
}

function apiPrivacyLevel(level?: string | null): PrivacyLevel | null {
  const key = level?.toLowerCase();
  if (key === 'public' || key === 'family' || key === 'private') {
    return key;
  }
  return null;
}

export function PrivacyBadge({ level }: { level: PrivacyLevel }) {
  const t = useTranslations('privacy');
  const tone = level === 'public' ? 'green' : level === 'family' ? 'gold' : 'red';
  return <Badge tone={tone}>{t(level)}</Badge>;
}

export function RelationshipBadge({ type }: { type: RelationshipType }) {
  const label: Record<RelationshipType, string> = {
    parent: 'Родитель',
    child: 'Ребёнок',
    spouse: 'Супруги',
    sibling: 'Сестра / брат',
    partner: 'Партнёр',
    adoptive_parent: 'Приёмный родитель',
    adoptive_child: 'Приёмный ребёнок',
  };

  return <Badge tone="blue">{label[type]}</Badge>;
}

export function PersonCard({ person }: { person: PersonSummary }) {
  const birthYear = person.birthDate?.slice(0, 4);
  const deathYear = person.deathDate?.slice(0, 4);
  const lifeYears =
    birthYear || deathYear
      ? [birthYear ? `р. ${birthYear}` : null, deathYear ? `ум. ${deathYear}` : null].filter(Boolean).join(' · ')
      : 'Даты не указаны';
  const privacy = apiPrivacyLevel(person.privacyLevel);

  return (
    <Card className="group">
      <div className="flex items-start gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-family-primary text-lg font-semibold text-white transition group-hover:scale-105 dark:bg-family-accent dark:text-slate-950">
          {person.primaryPhotoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={person.primaryPhotoUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            person.givenName.slice(0, 1)
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <Link href={`/persons/${person.id}`} className="truncate text-lg font-semibold text-family-ink hover:text-family-primary dark:text-white dark:hover:text-family-accent">
              {fullName(person)}
            </Link>
            {privacy ? <PrivacyBadge level={privacy} /> : null}
          </div>
          <p className="mt-2 text-sm text-stone-500 dark:text-slate-400">{lifeYears}</p>
          {person.primaryPhotoUrl ? (
            <p className="mt-4 text-sm leading-6 text-stone-600 dark:text-slate-300">Есть аватар и медиа в архиве семьи.</p>
          ) : (
            <p className="mt-4 text-sm leading-6 text-stone-600 dark:text-slate-300">
              Добавьте аватар и документы при создании персоны.
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}

export function PersonForm() {
  return (
    <Card>
      <h2 className="text-xl font-semibold">Новая персона</h2>
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <Input placeholder="Имя" />
        <Input placeholder="Фамилия" />
        <Select defaultValue="">
          <option value="" disabled>
            Пол
          </option>
          <option value="female">Женский</option>
          <option value="male">Мужской</option>
          <option value="unknown">Не указан</option>
        </Select>
        <Input type="date" />
        <Textarea className="md:col-span-2" placeholder="Биография, заметки, семейные истории" />
      </div>
      <div className="mt-5 flex justify-end">
        <Button type="button">Сохранить черновик</Button>
      </div>
    </Card>
  );
}

export function FamilyCard({ family }: { family: FamilySummary }) {
  return (
    <Card>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-xl font-semibold">{family.title}</h3>
          <p className="mt-2 text-sm text-stone-600 dark:text-slate-300">
            {family.membersCount} участников, {family.generations} поколений
          </p>
        </div>
        <PrivacyBadge level={family.privacy} />
      </div>
    </Card>
  );
}

export function TimelineView({ events }: { events: TimelineEvent[] }) {
  return (
    <div className="relative space-y-5 before:absolute before:left-5 before:top-3 before:h-[calc(100%-24px)] before:w-px before:bg-family-accent/40">
      {events.map((event) => (
        <div key={event.id} className="relative pl-14">
          <div className="absolute left-2 top-2 h-6 w-6 rounded-full border-4 border-white bg-family-accent shadow dark:border-slate-950" />
          <Card className="p-5">
            <div className="flex flex-wrap items-center gap-3">
              <Badge tone="gold">{event.date}</Badge>
              {event.place ? <Badge>{event.place}</Badge> : null}
            </div>
            <h3 className="mt-4 text-lg font-semibold">{event.title}</h3>
            <p className="mt-2 text-sm text-stone-600 dark:text-slate-300">{event.description}</p>
          </Card>
        </div>
      ))}
    </div>
  );
}

export function MediaUploader() {
  return (
    <Card className="border-dashed">
      <div className="rounded-2xl bg-stone-50 p-8 text-center dark:bg-slate-950">
        <p className="text-lg font-semibold">Загрузить фото, видео или voice story</p>
        <p className="mt-2 text-sm text-stone-500 dark:text-slate-400">
          UI готов к подключению MinIO presigned upload через backend.
        </p>
        <Button className="mt-5" type="button">
          Выбрать файлы
        </Button>
      </div>
    </Card>
  );
}

export function MediaCard({ item }: { item: MediaItem }) {
  return (
    <Card className="p-5">
      <div className="aspect-video rounded-2xl bg-gradient-to-br from-family-primary to-slate-700" />
      <div className="mt-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold">{item.title}</h3>
          <p className="mt-1 text-sm text-stone-500 dark:text-slate-400">
            {item.type} · {item.owner}
          </p>
        </div>
        <PrivacyBadge level={item.privacy} />
      </div>
    </Card>
  );
}

export function DocumentCard({ document }: { document: DocumentItem }) {
  const statusTone = document.status === 'processed' ? 'green' : document.status === 'ocr_pending' ? 'gold' : 'red';

  return (
    <Card>
      <div className="flex items-start justify-between gap-4">
        <div>
          <Badge tone={statusTone}>{document.status}</Badge>
          <h3 className="mt-4 text-lg font-semibold">{document.title}</h3>
          <p className="mt-2 text-sm text-stone-600 dark:text-slate-300">
            {document.type} · {document.date}
          </p>
        </div>
        <PrivacyBadge level={document.privacy} />
      </div>
    </Card>
  );
}

export function SearchBox({ placeholder = 'Найти человека, документ, место или событие' }: { placeholder?: string }) {
  return (
    <div className="flex flex-col gap-3 rounded-3xl border bg-white/85 p-3 shadow-premium dark:bg-slate-900/80 md:flex-row">
      <Input className="border-transparent bg-transparent focus:border-family-accent" placeholder={placeholder} />
      <Button type="button">Искать</Button>
    </div>
  );
}
