'use client';

import { FormEvent, useEffect, useState } from 'react';
import { PersonCard, PrivacyBadge } from '@/components/domain';
import { useAuth } from '@/components/auth-provider';
import { Button, Card, EmptyState, FormField, Input, PageHeader, Select, Textarea } from '@/components/ui';
import { apiClient, ApiError, formatApiError } from '@/lib/api-client';

type PersonDetail = {
  id: string;
  givenName: string;
  patronymic?: string | null;
  familyName?: string | null;
  gender?: string | null;
  birthDate?: string | null;
  deathDate?: string | null;
  privacyLevel?: string | null;
  biography?: string | null;
  primaryPhotoUrl?: string | null;
};

function toDateInput(value?: string | null) {
  if (!value) return '';
  return value.slice(0, 10);
}

function privacyForBadge(level?: string | null): 'public' | 'family' | 'private' {
  const key = level?.toLowerCase();
  if (key === 'public' || key === 'family' || key === 'private') return key;
  return 'family';
}

function personToForm(person: PersonDetail) {
  return {
    givenName: person.givenName ?? '',
    patronymic: person.patronymic ?? '',
    familyName: person.familyName ?? '',
    gender: person.gender ?? 'UNKNOWN',
    birthDate: toDateInput(person.birthDate),
    deathDate: toDateInput(person.deathDate),
    privacyLevel: person.privacyLevel ?? 'FAMILY',
    biography: person.biography ?? '',
  };
}

export function PersonDetailsWorkspace({ id }: { id: string }) {
  const { session, logout } = useAuth();
  const [person, setPerson] = useState<PersonDetail | null>(null);
  const [editForm, setEditForm] = useState(personToForm({ id, givenName: '' }));
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState('Загружаем профиль персоны...');

  async function load() {
    try {
      const data = (await apiClient.persons.one(id, session?.accessToken)) as PersonDetail;
      setPerson(data);
      setEditForm(personToForm(data));
      setStatus('Профиль загружен из API');
    } catch (error) {
      setStatus(formatApiError(error));
      setPerson(null);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, session?.accessToken]);

  async function savePerson(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setStatus('Сохраняем изменения...');
    try {
      await apiClient.persons.update(
        id,
        {
          ...editForm,
          patronymic: editForm.patronymic || undefined,
          familyName: editForm.familyName || undefined,
          birthDate: editForm.birthDate || undefined,
          deathDate: editForm.deathDate || undefined,
          biography: editForm.biography || undefined,
        },
        session?.accessToken,
      );
      await load();
      setIsEditing(false);
      setStatus('Профиль сохранён');
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

  if (!person) {
    return (
      <div className="space-y-8">
        <PageHeader
          title="Профиль персоны"
          description="Профиль персоны: ключевые данные, приватность, связи, документы, медиа и timeline жизни."
        />
        <EmptyState title="Профиль не загружен" description={status} />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Профиль персоны"
        description="Профиль персоны: ключевые данные, приватность, связи, документы, медиа и timeline жизни."
        action={
          isEditing ? (
            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                disabled={isSaving}
                onClick={() => {
                  setEditForm(personToForm(person));
                  setIsEditing(false);
                }}
              >
                Отмена
              </Button>
              <Button type="submit" form="person-edit-form" disabled={isSaving || !session}>
                {isSaving ? 'Сохраняем...' : 'Сохранить'}
              </Button>
            </div>
          ) : (
            <Button type="button" variant="secondary" disabled={!session} onClick={() => setIsEditing(true)}>
              Редактировать
            </Button>
          )
        }
      />

      {isEditing ? (
        <Card>
          <h2 className="text-xl font-semibold">Редактирование персоны</h2>
          <form id="person-edit-form" className="mt-5 grid gap-4 md:grid-cols-2" onSubmit={savePerson}>
            <FormField label="Фамилия" className="md:col-span-2">
              <Input
                value={editForm.familyName}
                onChange={(event) => setEditForm({ ...editForm, familyName: event.target.value })}
              />
            </FormField>
            <FormField label="Имя">
              <Input
                value={editForm.givenName}
                onChange={(event) => setEditForm({ ...editForm, givenName: event.target.value })}
                required
              />
            </FormField>
            <FormField label="Отчество">
              <Input
                value={editForm.patronymic}
                onChange={(event) => setEditForm({ ...editForm, patronymic: event.target.value })}
              />
            </FormField>
            <FormField label="Пол">
              <Select value={editForm.gender} onChange={(event) => setEditForm({ ...editForm, gender: event.target.value })}>
                <option value="UNKNOWN">Не указан</option>
                <option value="FEMALE">Женский</option>
                <option value="MALE">Мужской</option>
                <option value="OTHER">Другой</option>
              </Select>
            </FormField>
            <FormField label="Видимость">
              <Select
                value={editForm.privacyLevel}
                onChange={(event) => setEditForm({ ...editForm, privacyLevel: event.target.value })}
              >
                <option value="FAMILY">Только семья</option>
                <option value="PUBLIC">Публично</option>
                <option value="PRIVATE">Приватно</option>
              </Select>
            </FormField>
            <FormField label="Дата рождения">
              <Input
                type="date"
                value={editForm.birthDate}
                onChange={(event) => setEditForm({ ...editForm, birthDate: event.target.value })}
              />
            </FormField>
            <FormField label="Дата смерти">
              <Input
                type="date"
                value={editForm.deathDate}
                onChange={(event) => setEditForm({ ...editForm, deathDate: event.target.value })}
              />
            </FormField>
            <FormField label="Биография" className="md:col-span-2">
              <Textarea
                value={editForm.biography}
                onChange={(event) => setEditForm({ ...editForm, biography: event.target.value })}
              />
            </FormField>
          </form>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <PersonCard person={person} />
          <Card>
            <div className="flex flex-wrap gap-3">
              <PrivacyBadge level={privacyForBadge(person.privacyLevel)} />
            </div>
            <h2 className="mt-6 text-xl font-semibold">Биография</h2>
            <p className="mt-3 text-sm leading-6 text-stone-600 dark:text-slate-300">
              {person.biography?.trim() ? person.biography : 'Биография пока не заполнена.'}
            </p>
            <p className="mt-6 text-xs text-stone-400">{status}</p>
          </Card>
        </div>
      )}
    </div>
  );
}
