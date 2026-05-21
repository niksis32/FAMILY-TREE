'use client';

import { FormEvent, useEffect, useState } from 'react';
import { PersonCard } from '@/components/domain';
import { useAuth } from '@/components/auth-provider';
import { Button, Card, EmptyState, FormField, Input, Select, Textarea } from '@/components/ui';
import { PersonAttachmentsForm } from '@/components/person-attachments-form';
import { apiClient, ApiError, formatApiError } from '@/lib/api-client';
import { attachAssetsToPerson, emptyPersonAttachments, type PersonAttachmentDraft } from '@/lib/person-assets';
import type { PersonSummary } from '@family/shared';

const emptyForm = {
  givenName: '',
  patronymic: '',
  familyName: '',
  gender: 'UNKNOWN',
  birthDate: '',
  deathDate: '',
  privacyLevel: 'FAMILY',
  biography: '',
};

export function PersonsWorkspace() {
  const { session, logout } = useAuth();
  const [persons, setPersons] = useState<PersonSummary[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [status, setStatus] = useState('Загружаем персон из backend...');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [attachments, setAttachments] = useState<PersonAttachmentDraft>(emptyPersonAttachments);

  async function load() {
    setIsLoading(true);
    setStatus('Загружаем персон из backend...');
    try {
      const data = await apiClient.persons.list(session?.accessToken);
      setPersons(data);
      setStatus(data.length ? `Загружено персон: ${data.length}` : 'Персон пока нет. Создайте первую запись.');
    } catch (error) {
      setStatus(formatApiError(error));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.accessToken]);

  async function createPerson(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setStatus('Создаём персону...');
    try {
      const created = await apiClient.persons.create(
        {
          ...form,
          patronymic: form.patronymic || undefined,
          familyName: form.familyName || undefined,
          birthDate: form.birthDate || undefined,
          deathDate: form.deathDate || undefined,
          biography: form.biography || undefined,
        },
        session?.accessToken,
      );

      const hasFiles =
        attachments.avatarFile || attachments.mediaFiles.length > 0 || attachments.documents.length > 0;

      if (hasFiles) {
        setStatus('Загружаем фото и документы в MinIO...');
        await attachAssetsToPerson(created.id, attachments, session?.accessToken);
      }

      setForm(emptyForm);
      setAttachments(emptyPersonAttachments());
      await load();
      setStatus(
        hasFiles
          ? 'Персона создана: аватар, медиа и документы сохранены'
          : 'Персона создана и отправлена на индексацию поиска',
      );
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        logout();
        return;
      }
      setStatus(formatApiError(error));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_480px]">
      <div className="space-y-4">
        <p className="text-sm text-stone-500 dark:text-slate-400">{status}</p>
        {isLoading ? <EmptyState title="Загрузка" description="Получаем список персон из `/persons`." /> : null}
        {!isLoading && persons.length === 0 ? (
          <EmptyState title="Персон нет" description="Backend вернул пустой список. Создайте первую персону через форму." />
        ) : null}
        <div className="grid gap-4 md:grid-cols-2">
          {persons.map((person) => (
            <PersonCard key={person.id} person={person} />
          ))}
        </div>
      </div>

      <Card>
        <h2 className="text-xl font-semibold">Новая персона</h2>
        <form className="mt-5 grid gap-4 md:grid-cols-2" onSubmit={createPerson}>
          <FormField label="Фамилия" className="md:col-span-2">
            <Input
              value={form.familyName}
              onChange={(event) => setForm({ ...form, familyName: event.target.value })}
              placeholder="Иванов"
            />
          </FormField>
          <FormField label="Имя">
            <Input
              value={form.givenName}
              onChange={(event) => setForm({ ...form, givenName: event.target.value })}
              placeholder="Иван"
              required
            />
          </FormField>
          <FormField label="Отчество">
            <Input
              value={form.patronymic}
              onChange={(event) => setForm({ ...form, patronymic: event.target.value })}
              placeholder="Иванович"
            />
          </FormField>
          <FormField label="Пол">
            <Select value={form.gender} onChange={(event) => setForm({ ...form, gender: event.target.value })}>
              <option value="UNKNOWN">Не указан</option>
              <option value="FEMALE">Женский</option>
              <option value="MALE">Мужской</option>
              <option value="OTHER">Другой</option>
            </Select>
          </FormField>
          <FormField label="Видимость">
            <Select value={form.privacyLevel} onChange={(event) => setForm({ ...form, privacyLevel: event.target.value })}>
              <option value="FAMILY">Только семья</option>
              <option value="PUBLIC">Публично</option>
              <option value="PRIVATE">Приватно</option>
            </Select>
          </FormField>
          <FormField label="Дата рождения">
            <Input type="date" value={form.birthDate} onChange={(event) => setForm({ ...form, birthDate: event.target.value })} />
          </FormField>
          <FormField label="Дата смерти">
            <Input type="date" value={form.deathDate} onChange={(event) => setForm({ ...form, deathDate: event.target.value })} />
          </FormField>
          <FormField label="Биография" className="md:col-span-2">
            <Textarea
              value={form.biography}
              onChange={(event) => setForm({ ...form, biography: event.target.value })}
              placeholder="Заметки, семейные истории"
            />
          </FormField>
          <div className="md:col-span-2">
            <PersonAttachmentsForm draft={attachments} onChange={setAttachments} disabled={isSaving || !session} />
          </div>
          <div className="flex justify-end gap-3 md:col-span-2">
            <Button type="button" variant="secondary" onClick={() => void load()}>
              Обновить
            </Button>
            <Button disabled={isSaving || !session} type="submit">
              {isSaving ? 'Сохраняем...' : 'Создать'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
