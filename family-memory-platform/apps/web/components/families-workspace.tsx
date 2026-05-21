'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth-provider';
import { RelationshipFields } from '@/components/relationship-fields';
import { Button, Card, EmptyState, FormField, Input, Textarea } from '@/components/ui';
import { apiClient, formatApiError, type FamilyRecord, type RelationshipRecord } from '@/lib/api-client';
import {
  buildRelationshipCreates,
  emptyRelationshipDraft,
  isRelationshipDraftFilled,
  type RelationshipDraft,
} from '@/lib/relationship-draft';

export function FamiliesWorkspace() {
  const router = useRouter();
  const { session } = useAuth();
  const [families, setFamilies] = useState<FamilyRecord[]>([]);
  const [relationships, setRelationships] = useState<RelationshipRecord[]>([]);
  const [familyForm, setFamilyForm] = useState({ name: '', notes: '' });
  const [relationshipForm, setRelationshipForm] = useState<RelationshipDraft>(emptyRelationshipDraft());
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
      setStatus(formatApiError(error));
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
      const created = await apiClient.families.create(
        { name: familyForm.name || undefined, notes: familyForm.notes || undefined },
        session?.accessToken,
      );
      setFamilyForm({ name: '', notes: '' });
      setStatus('Семья создана');
      router.push(`/families/${created.id}`);
    } catch (error) {
      setStatus(formatApiError(error));
    } finally {
      setIsSaving(false);
    }
  }

  async function createRelationship(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    try {
      const payloads = buildRelationshipCreates(relationshipForm);
      if (payloads.length === 0) {
        setStatus('Заполните поля связи: семья, тип и участники');
        return;
      }
      for (const payload of payloads) {
        await apiClient.relationships.create(payload, session?.accessToken);
      }
      setRelationshipForm(emptyRelationshipDraft());
      await load();
      setStatus(payloads.length > 1 ? `Создано связей: ${payloads.length}` : 'Родственная связь создана');
    } catch (error) {
      setStatus(formatApiError(error));
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
            <FormField label="Название">
              <Input
                value={familyForm.name}
                onChange={(event) => setFamilyForm({ ...familyForm, name: event.target.value })}
                placeholder="Семья Ивановых"
              />
            </FormField>
            <FormField label="Заметки">
              <Textarea
                value={familyForm.notes}
                onChange={(event) => setFamilyForm({ ...familyForm, notes: event.target.value })}
                placeholder="Комментарий к семье"
              />
            </FormField>
            <Button disabled={isSaving || !session} type="submit">
              Создать семью
            </Button>
          </form>
        </Card>

        <Card>
          <h2 className="text-xl font-semibold">Управление Relationship</h2>
          <form className="mt-5 space-y-4" onSubmit={createRelationship}>
            <RelationshipFields families={families} draft={relationshipForm} onChange={setRelationshipForm} disabled={isSaving || !session} />
            <Button disabled={isSaving || !session || !isRelationshipDraftFilled(relationshipForm)} type="submit">
              Создать связь
            </Button>
          </form>
        </Card>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        {families.length === 0 ? <EmptyState title="Семей нет" description="Создайте первую семью через форму." /> : null}
        {families.map((family) => (
          <Link
            key={family.id}
            href={`/families/${family.id}`}
            className="block rounded-3xl border bg-white/85 p-6 shadow-premium transition hover:-translate-y-0.5 hover:border-family-accent dark:bg-slate-900/80"
          >
            <h3 className="text-xl font-semibold">{family.name ?? 'Без названия'}</h3>
            <p className="mt-2 text-sm text-stone-600 dark:text-slate-300">{family.notes ?? 'Заметок пока нет'}</p>
            <p className="mt-2 text-sm text-stone-500 dark:text-slate-400">Участников: {family.members?.length ?? 0}</p>
            <p className="mt-4 text-xs font-semibold text-family-primary dark:text-family-accent">Открыть профиль семьи →</p>
          </Link>
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
