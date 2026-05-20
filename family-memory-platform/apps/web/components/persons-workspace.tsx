'use client';

import { FormEvent, useEffect, useState } from 'react';
import { PersonCard } from '@/components/domain';
import { useAuth } from '@/components/auth-provider';
import { Button, Card, EmptyState, Input, Select, Textarea } from '@/components/ui';
import { apiClient } from '@/lib/api-client';
import type { PersonSummary } from '@family/shared';

const emptyForm = {
  givenName: '',
  familyName: '',
  gender: 'UNKNOWN',
  birthDate: '',
  deathDate: '',
  privacyLevel: 'FAMILY',
  biography: '',
};

export function PersonsWorkspace() {
  const { session } = useAuth();
  const [persons, setPersons] = useState<PersonSummary[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [status, setStatus] = useState('Загружаем персон из backend...');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  async function load() {
    setIsLoading(true);
    setStatus('Загружаем персон из backend...');
    try {
      const data = await apiClient.persons.list(session?.accessToken);
      setPersons(data);
      setStatus(data.length ? `Загружено персон: ${data.length}` : 'Персон пока нет. Создайте первую запись.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Не удалось загрузить персон');
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
      await apiClient.persons.create(
        {
          ...form,
          familyName: form.familyName || undefined,
          birthDate: form.birthDate || undefined,
          deathDate: form.deathDate || undefined,
          biography: form.biography || undefined,
        },
        session?.accessToken,
      );
      setForm(emptyForm);
      await load();
      setStatus('Персона создана и отправлена на индексацию поиска');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Не удалось создать персону');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
      <div className="space-y-4">
        <p className="text-sm text-stone-500 dark:text-slate-400">{status}</p>
        {isLoading ? <EmptyState title="Загрузка" description="Получаем список персон из `/persons`." /> : null}
        {!isLoading && persons.length === 0 ? <EmptyState title="Персон нет" description="Backend вернул пустой список. Создайте первую персону через форму." /> : null}
        <div className="grid gap-4 md:grid-cols-2">
          {persons.map((person) => (
            <PersonCard key={person.id} person={person} />
          ))}
        </div>
      </div>

      <Card>
        <h2 className="text-xl font-semibold">Новая персона</h2>
        <form className="mt-5 grid gap-4 md:grid-cols-2" onSubmit={createPerson}>
          <Input value={form.givenName} onChange={(event) => setForm({ ...form, givenName: event.target.value })} placeholder="Имя" required />
          <Input value={form.familyName} onChange={(event) => setForm({ ...form, familyName: event.target.value })} placeholder="Фамилия" />
          <Select value={form.gender} onChange={(event) => setForm({ ...form, gender: event.target.value })}>
            <option value="UNKNOWN">Пол не указан</option>
            <option value="FEMALE">Женский</option>
            <option value="MALE">Мужской</option>
            <option value="OTHER">Другой</option>
          </Select>
          <Select value={form.privacyLevel} onChange={(event) => setForm({ ...form, privacyLevel: event.target.value })}>
            <option value="FAMILY">Только семья</option>
            <option value="PUBLIC">Публично</option>
            <option value="PRIVATE">Приватно</option>
          </Select>
          <Input type="date" value={form.birthDate} onChange={(event) => setForm({ ...form, birthDate: event.target.value })} />
          <Input type="date" value={form.deathDate} onChange={(event) => setForm({ ...form, deathDate: event.target.value })} />
          <Textarea
            className="md:col-span-2"
            value={form.biography}
            onChange={(event) => setForm({ ...form, biography: event.target.value })}
            placeholder="Биография, заметки, семейные истории"
          />
          <div className="md:col-span-2 flex justify-end gap-3">
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
