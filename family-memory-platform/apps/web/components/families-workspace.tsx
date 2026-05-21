'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/components/auth-provider';
import { RelationshipFields } from '@/components/relationship-fields';
import { Button, Card, EmptyState, FormField, Input, Select, Textarea } from '@/components/ui';
import { apiClient, formatApiError, type FamilyMemberRecord, type FamilyRecord, type RelationshipRecord } from '@/lib/api-client';
import { familyMemberRoleLabel, FAMILY_MEMBER_ROLE_OPTIONS } from '@/lib/family-member-roles';
import { formatPersonLabel } from '@/lib/person-display';
import {
  buildRelationshipCreates,
  emptyRelationshipDraft,
  isRelationshipDraftFilled,
  type RelationshipDraft,
} from '@/lib/relationship-draft';
import type { PersonSummary } from '@family/shared';

export function FamiliesWorkspace() {
  const { session } = useAuth();
  const [families, setFamilies] = useState<FamilyRecord[]>([]);
  const [persons, setPersons] = useState<PersonSummary[]>([]);
  const [relationships, setRelationships] = useState<RelationshipRecord[]>([]);
  const [familyForm, setFamilyForm] = useState({ name: '', notes: '' });
  const [relationshipForm, setRelationshipForm] = useState<RelationshipDraft>(emptyRelationshipDraft());
  const [selectedFamilyId, setSelectedFamilyId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: '', notes: '' });
  const [newMember, setNewMember] = useState({ personId: '', role: 'CHILD' });
  const [status, setStatus] = useState('Загружаем семьи и связи...');
  const [isSaving, setIsSaving] = useState(false);

  const selectedFamily = useMemo(
    () => families.find((family) => family.id === selectedFamilyId) ?? null,
    [families, selectedFamilyId],
  );

  const memberPersonIds = useMemo(
    () => new Set((selectedFamily?.members ?? []).map((member) => member.person.id)),
    [selectedFamily],
  );

  const availablePersons = useMemo(
    () => persons.filter((person) => !memberPersonIds.has(person.id)),
    [persons, memberPersonIds],
  );

  async function load() {
    setStatus('Загружаем семьи и связи из backend...');
    try {
      const [nextFamilies, nextRelationships, nextPersons] = await Promise.all([
        apiClient.families.list(session?.accessToken),
        apiClient.relationships.list(session?.accessToken),
        apiClient.persons.list(session?.accessToken),
      ]);
      setFamilies(nextFamilies);
      setRelationships(nextRelationships);
      setPersons(nextPersons);

      if (selectedFamilyId) {
        const fresh = await apiClient.families.one(selectedFamilyId, session?.accessToken);
        setFamilies((prev) => prev.map((family) => (family.id === fresh.id ? fresh : family)));
        setEditForm({ name: fresh.name ?? '', notes: fresh.notes ?? '' });
      }

      setStatus(`Семей: ${nextFamilies.length}, связей: ${nextRelationships.length}`);
    } catch (error) {
      setStatus(formatApiError(error));
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.accessToken]);

  function openFamilyEditor(family: FamilyRecord) {
    setSelectedFamilyId(family.id);
    setEditForm({ name: family.name ?? '', notes: family.notes ?? '' });
    setNewMember({ personId: '', role: 'CHILD' });
    setRelationshipForm((draft) => ({ ...draft, familyId: family.id }));
  }

  async function createFamily(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    try {
      const created = await apiClient.families.create(
        { name: familyForm.name || undefined, notes: familyForm.notes || undefined },
        session?.accessToken,
      );
      setFamilyForm({ name: '', notes: '' });
      await load();
      openFamilyEditor(created);
      setStatus('Семья создана — откройте редактор ниже');
    } catch (error) {
      setStatus(formatApiError(error));
    } finally {
      setIsSaving(false);
    }
  }

  async function saveFamily(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedFamilyId) return;
    setIsSaving(true);
    try {
      const updated = await apiClient.families.update(
        selectedFamilyId,
        { name: editForm.name || undefined, notes: editForm.notes || undefined },
        session?.accessToken,
      );
      setFamilies((prev) => prev.map((family) => (family.id === updated.id ? updated : family)));
      setStatus('Семья сохранена');
    } catch (error) {
      setStatus(formatApiError(error));
    } finally {
      setIsSaving(false);
    }
  }

  async function addMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedFamilyId || !newMember.personId) return;
    setIsSaving(true);
    try {
      const updated = await apiClient.families.addMember(
        selectedFamilyId,
        { personId: newMember.personId, role: newMember.role },
        session?.accessToken,
      );
      setFamilies((prev) => prev.map((family) => (family.id === updated.id ? updated : family)));
      setNewMember({ personId: '', role: 'CHILD' });
      setStatus('Участник добавлен в семью');
    } catch (error) {
      setStatus(formatApiError(error));
    } finally {
      setIsSaving(false);
    }
  }

  async function changeMemberRole(member: FamilyMemberRecord, role: string) {
    if (!selectedFamilyId) return;
    setIsSaving(true);
    try {
      const updated = await apiClient.families.updateMember(selectedFamilyId, member.id, { role }, session?.accessToken);
      setFamilies((prev) => prev.map((family) => (family.id === updated.id ? updated : family)));
      setStatus('Роль участника обновлена');
    } catch (error) {
      setStatus(formatApiError(error));
    } finally {
      setIsSaving(false);
    }
  }

  async function removeMember(member: FamilyMemberRecord) {
    if (!selectedFamilyId) return;
    setIsSaving(true);
    try {
      const updated = await apiClient.families.removeMember(selectedFamilyId, member.id, session?.accessToken);
      setFamilies((prev) => prev.map((family) => (family.id === updated.id ? updated : family)));
      setStatus('Участник удалён из семьи');
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
          <button
            key={family.id}
            type="button"
            onClick={() => openFamilyEditor(family)}
            className={`rounded-3xl border bg-white/85 p-6 text-left shadow-premium transition hover:-translate-y-0.5 dark:bg-slate-900/80 ${
              selectedFamilyId === family.id ? 'border-family-accent ring-2 ring-family-accent/30' : ''
            }`}
          >
            <h3 className="text-xl font-semibold">{family.name ?? 'Без названия'}</h3>
            <p className="mt-2 text-sm text-stone-600 dark:text-slate-300">{family.notes ?? 'Заметок пока нет'}</p>
            <p className="mt-2 text-sm text-stone-500 dark:text-slate-400">Участников: {family.members?.length ?? 0}</p>
            <p className="mt-4 text-xs font-semibold text-family-primary dark:text-family-accent">Нажмите, чтобы редактировать</p>
          </button>
        ))}
      </div>

      {selectedFamily ? (
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-semibold">Редактирование: {selectedFamily.name ?? 'Семья'}</h2>
            <Button type="button" variant="ghost" onClick={() => setSelectedFamilyId(null)}>
              Закрыть
            </Button>
          </div>

          <form className="mt-5 grid gap-4 md:grid-cols-2" onSubmit={saveFamily}>
            <FormField label="Название" className="md:col-span-2">
              <Input value={editForm.name} onChange={(event) => setEditForm({ ...editForm, name: event.target.value })} />
            </FormField>
            <FormField label="Заметки" className="md:col-span-2">
              <Textarea value={editForm.notes} onChange={(event) => setEditForm({ ...editForm, notes: event.target.value })} />
            </FormField>
            <div className="md:col-span-2">
              <Button disabled={isSaving || !session} type="submit">
                Сохранить семью
              </Button>
            </div>
          </form>

          <div className="mt-8 border-t border-stone-200 pt-6 dark:border-slate-800">
            <h3 className="text-lg font-semibold">Участники семьи</h3>
            <div className="mt-4 space-y-3">
              {(selectedFamily.members ?? []).length === 0 ? (
                <p className="text-sm text-stone-500 dark:text-slate-400">Участников пока нет — добавьте персону ниже.</p>
              ) : null}
              {(selectedFamily.members ?? []).map((member) => (
                <div
                  key={member.id}
                  className="flex flex-wrap items-center gap-3 rounded-2xl border bg-stone-50 p-4 dark:bg-slate-950"
                >
                  <span className="min-w-0 flex-1 font-medium">{formatPersonLabel(member.person)}</span>
                  <Select
                    className="w-40"
                    value={member.role}
                    onChange={(event) => void changeMemberRole(member, event.target.value)}
                    disabled={isSaving}
                  >
                    {FAMILY_MEMBER_ROLE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                  <Button type="button" variant="secondary" disabled={isSaving} onClick={() => void removeMember(member)}>
                    Убрать
                  </Button>
                </div>
              ))}
            </div>

            <form className="mt-6 grid gap-4 md:grid-cols-[1fr_auto_auto]" onSubmit={addMember}>
              <FormField label="Добавить персону">
                <Select
                  value={newMember.personId}
                  onChange={(event) => setNewMember({ ...newMember, personId: event.target.value })}
                  disabled={isSaving || availablePersons.length === 0}
                >
                  <option value="">{availablePersons.length ? 'Выберите персону' : 'Все персоны уже в семье'}</option>
                  {availablePersons.map((person) => (
                    <option key={person.id} value={person.id}>
                      {formatPersonLabel(person)}
                    </option>
                  ))}
                </Select>
              </FormField>
              <FormField label="Роль">
                <Select value={newMember.role} onChange={(event) => setNewMember({ ...newMember, role: event.target.value })}>
                  {FAMILY_MEMBER_ROLE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </FormField>
              <div className="flex items-end">
                <Button disabled={isSaving || !session || !newMember.personId} type="submit">
                  Добавить
                </Button>
              </div>
            </form>
            <p className="mt-2 text-xs text-stone-500 dark:text-slate-400">
              Роли: {FAMILY_MEMBER_ROLE_OPTIONS.map((option) => option.label).join(', ')}. Сейчас: {familyMemberRoleLabel(newMember.role)}.
            </p>
          </div>
        </Card>
      ) : (
        <p className="text-sm text-stone-500 dark:text-slate-400">Выберите карточку семьи выше, чтобы изменить название, заметки и состав участников.</p>
      )}

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
