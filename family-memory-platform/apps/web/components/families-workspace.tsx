'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useAuth } from '@/components/auth-provider';
import { Button, Card, EmptyState, Input, Select, Textarea } from '@/components/ui';
import { apiClient, type FamilyRecord, type RelationshipRecord } from '@/lib/api-client';

export function FamiliesWorkspace() {
  const { session } = useAuth();
  const [families, setFamilies] = useState<FamilyRecord[]>([]);
  const [relationships, setRelationships] = useState<RelationshipRecord[]>([]);
  const [familyForm, setFamilyForm] = useState({ name: '', notes: '' });
  const [relationshipForm, setRelationshipForm] = useState({ fromPersonId: '', toPersonId: '', type: 'PARENT', notes: '' });
  const [status, setStatus] = useState('Загружаем семьи и связи...');
  const [isSaving, setIsSaving] = useState(false);

  async function load() {
    setStatus('Загружаем семьи и связи из backend...');
    try {
      const [nextFamilies, nextRelationships] = await Promise.all([
        apiClient.families.list(session?.accessToken),
        apiClient.relationships.list(session?.accessToken),
      ]);
      setFamilies(nextFamilies);
      setRelationships(nextRelationships);
      setStatus(`Семей: ${nextFamilies.length}, связей: ${nextRelationships.length}`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Не удалось загрузить семьи и связи');
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.accessToken]);

  async function createFamily(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    try {
      await apiClient.families.create({ name: familyForm.name || undefined, notes: familyForm.notes || undefined }, session?.accessToken);
      setFamilyForm({ name: '', notes: '' });
      await load();
      setStatus('Семья создана');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Не удалось создать семью');
    } finally {
      setIsSaving(false);
    }
  }

  async function createRelationship(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    try {
      await apiClient.relationships.create(
        {
          ...relationshipForm,
          notes: relationshipForm.notes || undefined,
        },
        session?.accessToken,
      );
      setRelationshipForm({ fromPersonId: '', toPersonId: '', type: 'PARENT', notes: '' });
      await load();
      setStatus('Родственная связь создана');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Не удалось создать связь');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-stone-500 dark:text-slate-400">{status}</p>
      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <h2 className="text-xl font-semibold">Создать семью</h2>
          <form className="mt-5 space-y-4" onSubmit={createFamily}>
            <Input value={familyForm.name} onChange={(event) => setFamilyForm({ ...familyForm, name: event.target.value })} placeholder="Название семьи" />
            <Textarea value={familyForm.notes} onChange={(event) => setFamilyForm({ ...familyForm, notes: event.target.value })} placeholder="Заметки" />
            <Button disabled={isSaving || !session} type="submit">
              Создать семью
            </Button>
          </form>
        </Card>

        <Card>
          <h2 className="text-xl font-semibold">Управление Relationship</h2>
          <form className="mt-5 grid gap-4 md:grid-cols-2" onSubmit={createRelationship}>
            <Input value={relationshipForm.fromPersonId} onChange={(event) => setRelationshipForm({ ...relationshipForm, fromPersonId: event.target.value })} placeholder="From Person ID" required />
            <Input value={relationshipForm.toPersonId} onChange={(event) => setRelationshipForm({ ...relationshipForm, toPersonId: event.target.value })} placeholder="To Person ID" required />
            <Select value={relationshipForm.type} onChange={(event) => setRelationshipForm({ ...relationshipForm, type: event.target.value })}>
              <option value="PARENT">Родитель</option>
              <option value="CHILD">Ребёнок</option>
              <option value="SPOUSE">Супруги</option>
              <option value="SIBLING">Сиблинг</option>
              <option value="PARTNER">Партнёр</option>
              <option value="ADOPTIVE_PARENT">Приёмный родитель</option>
              <option value="ADOPTIVE_CHILD">Приёмный ребёнок</option>
            </Select>
            <Input value={relationshipForm.notes} onChange={(event) => setRelationshipForm({ ...relationshipForm, notes: event.target.value })} placeholder="Заметки" />
            <Button className="md:col-span-2" disabled={isSaving || !session} type="submit">
              Создать связь
            </Button>
          </form>
        </Card>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        {families.length === 0 ? <EmptyState title="Семей нет" description="Создайте первую семью через форму." /> : null}
        {families.map((family) => (
          <Card key={family.id}>
            <h3 className="text-xl font-semibold">{family.name ?? 'Без названия'}</h3>
            <p className="mt-2 text-sm text-stone-600 dark:text-slate-300">{family.notes ?? 'Заметок пока нет'}</p>
            <p className="mt-4 text-xs text-stone-400">ID: {family.id}</p>
          </Card>
        ))}
      </div>

      <Card>
        <h2 className="text-xl font-semibold">Текущие связи</h2>
        <div className="mt-4 grid gap-3">
          {relationships.length === 0 ? <p className="text-sm text-stone-500 dark:text-slate-400">Связей пока нет</p> : null}
          {relationships.map((relationship) => (
            <div key={relationship.id} className="rounded-2xl border bg-stone-50 p-4 text-sm dark:bg-slate-950">
              <p className="font-semibold">{relationship.type}</p>
              <p className="mt-1 text-stone-500 dark:text-slate-400">
                {relationship.fromPersonId} {'->'} {relationship.toPersonId}
              </p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
