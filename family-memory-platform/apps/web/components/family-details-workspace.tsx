'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/components/auth-provider';
import { Button, Card, EmptyState, FormField, Input, PageHeader, Select, Textarea } from '@/components/ui';
import { apiClient, ApiError, formatApiError, type FamilyMemberRecord, type FamilyRecord } from '@/lib/api-client';
import { familyMemberRoleLabel, FAMILY_MEMBER_ROLE_OPTIONS } from '@/lib/family-member-roles';
import { formatPersonLabel } from '@/lib/person-display';
import type { PersonSummary } from '@family/shared';

export function FamilyDetailsWorkspace({ id }: { id: string }) {
  const { session, logout } = useAuth();
  const [family, setFamily] = useState<FamilyRecord | null>(null);
  const [persons, setPersons] = useState<PersonSummary[]>([]);
  const [editForm, setEditForm] = useState({ name: '', notes: '' });
  const [newMember, setNewMember] = useState({ personId: '', role: 'CHILD' });
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState('Загружаем семью...');

  const memberPersonIds = useMemo(
    () => new Set((family?.members ?? []).map((member) => member.person.id)),
    [family],
  );

  const availablePersons = useMemo(
    () => persons.filter((person) => !memberPersonIds.has(person.id)),
    [persons, memberPersonIds],
  );

  async function load() {
    try {
      const [nextFamily, nextPersons] = await Promise.all([
        apiClient.families.one(id, session?.accessToken),
        apiClient.persons.list(session?.accessToken),
      ]);
      setFamily(nextFamily);
      setPersons(nextPersons);
      setEditForm({ name: nextFamily.name ?? '', notes: nextFamily.notes ?? '' });
      setStatus('Семья загружена из API');
    } catch (error) {
      setFamily(null);
      setStatus(formatApiError(error));
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, session?.accessToken]);

  async function saveFamily(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setStatus('Сохраняем семью...');
    try {
      await apiClient.families.update(
        id,
        { name: editForm.name || undefined, notes: editForm.notes || undefined },
        session?.accessToken,
      );
      await load();
      setIsEditing(false);
      setStatus('Семья сохранена');
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

  async function addMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!newMember.personId) return;
    setIsSaving(true);
    try {
      await apiClient.families.addMember(id, { personId: newMember.personId, role: newMember.role }, session?.accessToken);
      setNewMember({ personId: '', role: 'CHILD' });
      await load();
      setStatus('Участник добавлен');
    } catch (error) {
      setStatus(formatApiError(error));
    } finally {
      setIsSaving(false);
    }
  }

  async function changeMemberRole(member: FamilyMemberRecord, role: string) {
    setIsSaving(true);
    try {
      await apiClient.families.updateMember(id, member.id, { role }, session?.accessToken);
      await load();
      setStatus('Роль обновлена');
    } catch (error) {
      setStatus(formatApiError(error));
    } finally {
      setIsSaving(false);
    }
  }

  async function removeMember(member: FamilyMemberRecord) {
    setIsSaving(true);
    try {
      await apiClient.families.removeMember(id, member.id, session?.accessToken);
      await load();
      setStatus('Участник удалён из семьи');
    } catch (error) {
      setStatus(formatApiError(error));
    } finally {
      setIsSaving(false);
    }
  }

  if (!family) {
    return (
      <div className="space-y-8">
        <PageHeader title="Семья" description="Просмотр и редактирование состава семьи." />
        <EmptyState title="Семья не загружена" description={status} />
        <Link href="/families" className="text-sm font-semibold text-family-primary underline dark:text-family-accent">
          ← К списку семей
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title={family.name?.trim() || 'Семья'}
        description="Название, заметки и состав участников семьи."
        action={
          isEditing ? (
            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                disabled={isSaving}
                onClick={() => {
                  setEditForm({ name: family.name ?? '', notes: family.notes ?? '' });
                  setIsEditing(false);
                }}
              >
                Отмена
              </Button>
              <Button type="submit" form="family-edit-form" disabled={isSaving || !session}>
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

      <p className="text-sm text-stone-500 dark:text-slate-400">
        <Link href="/families" className="font-semibold text-family-primary underline dark:text-family-accent">
          ← К списку семей
        </Link>
        {' · '}
        {status}
      </p>

      {isEditing ? (
        <Card>
          <h2 className="text-xl font-semibold">Редактирование семьи</h2>
          <form id="family-edit-form" className="mt-5 grid gap-4 md:grid-cols-2" onSubmit={saveFamily}>
            <FormField label="Название" className="md:col-span-2">
              <Input value={editForm.name} onChange={(event) => setEditForm({ ...editForm, name: event.target.value })} />
            </FormField>
            <FormField label="Заметки" className="md:col-span-2">
              <Textarea value={editForm.notes} onChange={(event) => setEditForm({ ...editForm, notes: event.target.value })} />
            </FormField>
          </form>
        </Card>
      ) : (
        <Card>
          <h2 className="text-xl font-semibold">{family.name ?? 'Без названия'}</h2>
          <p className="mt-3 text-sm text-stone-600 dark:text-slate-300">{family.notes?.trim() || 'Заметок пока нет.'}</p>
          <p className="mt-4 text-sm text-stone-500 dark:text-slate-400">Участников: {family.members?.length ?? 0}</p>
        </Card>
      )}

      <Card>
        <h2 className="text-xl font-semibold">Участники семьи</h2>
        <div className="mt-4 space-y-3">
          {(family.members ?? []).length === 0 ? (
            <p className="text-sm text-stone-500 dark:text-slate-400">Участников пока нет — добавьте персону ниже.</p>
          ) : null}
          {(family.members ?? []).map((member) => (
            <div
              key={member.id}
              className="flex flex-wrap items-center gap-3 rounded-2xl border bg-stone-50 p-4 dark:bg-slate-950"
            >
              <Link
                href={`/persons/${member.person.id}`}
                className="min-w-0 flex-1 font-medium text-family-primary hover:underline dark:text-family-accent"
              >
                {formatPersonLabel(member.person)}
              </Link>
              <span className="text-xs text-stone-500 dark:text-slate-400">{familyMemberRoleLabel(member.role)}</span>
              {isEditing ? (
                <>
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
                </>
              ) : null}
            </div>
          ))}
        </div>

        {isEditing ? (
          <form className="mt-6 grid gap-4 md:grid-cols-[1fr_auto_auto]" onSubmit={addMember}>
            <FormField label="Добавить персону">
              <Select
                value={newMember.personId}
                onChange={(event) => setNewMember({ ...newMember, personId: event.target.value })}
                disabled={isSaving || availablePersons.length === 0}
              >
                <option value="">Не выбрано</option>
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
        ) : (
          <p className="mt-4 text-sm text-stone-500 dark:text-slate-400">Нажмите «Редактировать», чтобы менять состав семьи.</p>
        )}
      </Card>
    </div>
  );
}
