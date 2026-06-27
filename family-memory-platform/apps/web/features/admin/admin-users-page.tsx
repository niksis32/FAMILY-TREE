'use client';

import { useCallback, useEffect, useState } from 'react';
import { Pencil, Trash2, UserPlus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { ModalShell } from '@family/ui';
import {
  ADMIN_USER_SOFT_DELETE_PHRASE,
  type AdminCreateUserInput,
  type AdminUpdateUserInput,
  type AdminUserListResponse,
  type AdminUserSummary,
} from '@family/shared';
import { useAuth } from '@/components/auth-provider';
import { Badge, Button, Card, FormField, Input, Select } from '@/components/ui';
import { apiClient, formatApiError } from '@/lib/api-client';

const PAGE_SIZE = 25;
const ROLES = ['VIEWER', 'EDITOR', 'ADMIN'] as const;

type UserFormState = {
  email: string;
  password: string;
  displayName: string;
  role: (typeof ROLES)[number];
  isActive: boolean;
};

const emptyForm = (): UserFormState => ({
  email: '',
  password: '',
  displayName: '',
  role: 'VIEWER',
  isActive: true,
});

function formFromUser(user: AdminUserSummary): UserFormState {
  return {
    email: user.email,
    password: '',
    displayName: user.displayName ?? '',
    role: user.role,
    isActive: user.isActive,
  };
}

export function AdminUsersPage() {
  const { session } = useAuth();
  const t = useTranslations('adminPanel');
  const [data, setData] = useState<AdminUserListResponse | null>(null);
  const [offset, setOffset] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  const [formOpen, setFormOpen] = useState<'create' | 'edit' | null>(null);
  const [form, setForm] = useState<UserFormState>(emptyForm());
  const [editingUser, setEditingUser] = useState<AdminUserSummary | null>(null);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingCreate, setPendingCreate] = useState<AdminCreateUserInput | null>(null);
  const [pendingUpdate, setPendingUpdate] = useState<{ id: string; body: AdminUpdateUserInput } | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<AdminUserSummary | null>(null);
  const [deleteStep, setDeleteStep] = useState<1 | 2>(1);
  const [deleteEmail, setDeleteEmail] = useState('');
  const [deletePhrase, setDeletePhrase] = useState('');

  const load = useCallback(async () => {
    if (!session?.accessToken) return;
    setLoading(true);
    setError('');
    try {
      const result = await apiClient.admin.users(session.accessToken, { limit: PAGE_SIZE, offset });
      setData(result);
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setLoading(false);
    }
  }, [offset, session?.accessToken]);

  useEffect(() => {
    void load();
  }, [load]);

  function openCreate() {
    setForm(emptyForm());
    setEditingUser(null);
    setFormOpen('create');
  }

  function openEdit(user: AdminUserSummary) {
    setForm(formFromUser(user));
    setEditingUser(user);
    setFormOpen('edit');
  }

  function closeForm() {
    setFormOpen(null);
    setEditingUser(null);
    setForm(emptyForm());
  }

  function submitForm(event?: React.FormEvent | React.MouseEvent) {
    event?.preventDefault();
    if (formOpen === 'create') {
      setPendingCreate({
        email: form.email.trim(),
        password: form.password,
        displayName: form.displayName.trim(),
        role: form.role,
        isActive: form.isActive,
      });
      setPendingUpdate(null);
    } else if (formOpen === 'edit' && editingUser) {
      const body: AdminUpdateUserInput = {
        displayName: form.displayName.trim(),
        role: form.role,
        isActive: form.isActive,
      };
      if (form.password.trim()) body.password = form.password;
      setPendingUpdate({ id: editingUser.id, body });
      setPendingCreate(null);
    }
    setConfirmOpen(true);
  }

  async function executeConfirmedAction() {
    if (!session?.accessToken) return;
    setBusy(true);
    setError('');
    try {
      if (pendingCreate) {
        await apiClient.admin.createUser(session.accessToken, pendingCreate);
        closeForm();
      } else if (pendingUpdate) {
        await apiClient.admin.updateUser(session.accessToken, pendingUpdate.id, pendingUpdate.body);
        closeForm();
      }
      setConfirmOpen(false);
      setPendingCreate(null);
      setPendingUpdate(null);
      await load();
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setBusy(false);
    }
  }

  function openDelete(user: AdminUserSummary) {
    setDeleteTarget(user);
    setDeleteStep(1);
    setDeleteEmail('');
    setDeletePhrase('');
  }

  function closeDelete() {
    setDeleteTarget(null);
    setDeleteStep(1);
    setDeleteEmail('');
    setDeletePhrase('');
  }

  async function executeSoftDelete() {
    if (!session?.accessToken || !deleteTarget) return;
    setBusy(true);
    setError('');
    try {
      await apiClient.admin.softDeleteUser(session.accessToken, deleteTarget.id, {
        confirmEmail: deleteEmail.trim(),
        confirmPhrase: deletePhrase.trim(),
      });
      closeDelete();
      await load();
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setBusy(false);
    }
  }

  const canPrev = offset > 0;
  const canNext = data ? offset + PAGE_SIZE < data.total : false;
  const isSelf = (userId: string) => session?.user.id === userId;

  return (
    <div className="space-y-4">
      <Card className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-serif text-xl font-semibold">{t('usersTitle')}</h2>
          <p className="mt-1 text-sm text-stone-500 dark:text-slate-400">{t('usersHint')}</p>
        </div>
        <Button className="gap-2 self-start" onClick={openCreate}>
          <UserPlus className="h-4 w-4" aria-hidden />
          {t('usersAdd')}
        </Button>
      </Card>

      {error ? <p className="text-sm text-rose-600">{error}</p> : null}

      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="border-b bg-stone-50/80 text-xs uppercase tracking-wide text-stone-500 dark:bg-slate-900/60">
              <tr>
                <th className="px-4 py-3">{t('usersTable.name')}</th>
                <th className="px-4 py-3">{t('usersTable.email')}</th>
                <th className="px-4 py-3">{t('usersTable.role')}</th>
                <th className="px-4 py-3">{t('usersTable.workspaces')}</th>
                <th className="px-4 py-3">{t('usersTable.status')}</th>
                <th className="px-4 py-3">{t('usersTable.registered')}</th>
                <th className="px-4 py-3 text-right">{t('usersTable.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {loading && !data ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-stone-500">
                    {t('loading')}
                  </td>
                </tr>
              ) : null}
              {data?.items.map((user) => (
                <tr key={user.id} className="border-b border-stone-100 dark:border-slate-800">
                  <td className="px-4 py-3 font-medium">{user.displayName ?? '—'}</td>
                  <td className="px-4 py-3 font-mono text-xs">{user.email}</td>
                  <td className="px-4 py-3">
                    <Badge tone={user.role === 'ADMIN' ? 'gold' : 'muted'}>{user.role}</Badge>
                  </td>
                  <td className="px-4 py-3">{user.workspaceCount}</td>
                  <td className="px-4 py-3">
                    <Badge tone={user.isActive ? 'gold' : 'muted'}>
                      {user.isActive ? t('usersTable.active') : t('usersTable.inactive')}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-stone-500">
                    {new Date(user.createdAt).toLocaleDateString('ru-RU')}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Button variant="secondary" className="h-8 px-2.5" onClick={() => openEdit(user)} aria-label={t('usersEdit')}>
                        <Pencil className="h-3.5 w-3.5" aria-hidden />
                      </Button>
                      <Button
                        variant="secondary"
                        className="h-8 px-2.5 text-rose-700 hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-950/40"
                        disabled={isSelf(user.id)}
                        onClick={() => openDelete(user)}
                        aria-label={t('usersDelete')}
                        title={isSelf(user.id) ? t('usersDeleteSelfHint') : undefined}
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {data && data.items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-stone-500">
                    {t('usersEmpty')}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Card>

      {data ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-stone-500">
            {t('usersPagination', { from: data.total === 0 ? 0 : offset + 1, to: Math.min(offset + PAGE_SIZE, data.total), total: data.total })}
          </p>
          <div className="flex gap-2">
            <Button variant="secondary" disabled={!canPrev || loading} onClick={() => setOffset((v) => Math.max(0, v - PAGE_SIZE))}>
              {t('prevPage')}
            </Button>
            <Button variant="secondary" disabled={!canNext || loading} onClick={() => setOffset((v) => v + PAGE_SIZE)}>
              {t('nextPage')}
            </Button>
          </div>
        </div>
      ) : null}

      <ModalShell
        open={formOpen !== null}
        onClose={closeForm}
        title={formOpen === 'create' ? t('usersForm.createTitle') : t('usersForm.editTitle')}
        subtitle={formOpen === 'create' ? t('usersForm.createHint') : t('usersForm.editHint')}
        size="md"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={closeForm} disabled={busy}>
              {t('cancel')}
            </Button>
            <Button onClick={submitForm} disabled={busy}>
              {t('continue')}
            </Button>
          </div>
        }
      >
        <form className="grid gap-4" onSubmit={submitForm}>
          {formOpen === 'create' ? (
            <FormField label={t('usersForm.email')}>
              <Input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm((v) => ({ ...v, email: e.target.value }))}
                autoComplete="off"
              />
            </FormField>
          ) : null}
          <FormField label={t('usersForm.displayName')}>
            <Input
              required
              minLength={2}
              value={form.displayName}
              onChange={(e) => setForm((v) => ({ ...v, displayName: e.target.value }))}
            />
          </FormField>
          <FormField label={formOpen === 'edit' ? t('usersForm.passwordOptional') : t('usersForm.password')}>
            <Input
              type="password"
              required={formOpen === 'create'}
              minLength={formOpen === 'create' ? 8 : undefined}
              value={form.password}
              onChange={(e) => setForm((v) => ({ ...v, password: e.target.value }))}
              autoComplete="new-password"
            />
          </FormField>
          <FormField label={t('usersForm.role')}>
            <Select value={form.role} onChange={(e) => setForm((v) => ({ ...v, role: e.target.value as UserFormState['role'] }))}>
              {ROLES.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label={t('usersForm.status')}>
            <Select
              value={form.isActive ? 'active' : 'inactive'}
              onChange={(e) => setForm((v) => ({ ...v, isActive: e.target.value === 'active' }))}
              disabled={formOpen === 'edit' && editingUser ? isSelf(editingUser.id) : false}
            >
              <option value="active">{t('usersTable.active')}</option>
              <option value="inactive">{t('usersTable.inactive')}</option>
            </Select>
          </FormField>
        </form>
      </ModalShell>

      <ModalShell
        open={confirmOpen}
        onClose={() => {
          if (busy) return;
          setConfirmOpen(false);
        }}
        title={pendingCreate ? t('usersConfirm.createTitle') : t('usersConfirm.editTitle')}
        subtitle={pendingCreate ? t('usersConfirm.createBody') : t('usersConfirm.editBody')}
        size="md"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setConfirmOpen(false)} disabled={busy}>
              {t('no')}
            </Button>
            <Button onClick={() => void executeConfirmedAction()} disabled={busy}>
              {busy ? t('loading') : t('yes')}
            </Button>
          </div>
        }
      >
        <div className="space-y-2 text-sm text-stone-600 dark:text-slate-300">
          {pendingCreate ? (
            <>
              <p>
                <span className="font-medium">{t('usersForm.email')}:</span> {pendingCreate.email}
              </p>
              <p>
                <span className="font-medium">{t('usersForm.displayName')}:</span> {pendingCreate.displayName}
              </p>
              <p>
                <span className="font-medium">{t('usersForm.role')}:</span> {pendingCreate.role}
              </p>
            </>
          ) : null}
          {pendingUpdate && editingUser ? (
            <>
              <p>
                <span className="font-medium">{t('usersForm.email')}:</span> {editingUser.email}
              </p>
              <p>
                <span className="font-medium">{t('usersForm.displayName')}:</span> {pendingUpdate.body.displayName}
              </p>
              <p>
                <span className="font-medium">{t('usersForm.role')}:</span> {pendingUpdate.body.role}
              </p>
            </>
          ) : null}
        </div>
      </ModalShell>

      <ModalShell
        open={deleteTarget !== null && deleteStep === 1}
        onClose={closeDelete}
        title={t('usersDeleteStep1.title')}
        subtitle={t('usersDeleteStep1.body', { name: deleteTarget?.displayName ?? deleteTarget?.email ?? '' })}
        size="md"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={closeDelete}>
              {t('no')}
            </Button>
            <Button
              className="bg-rose-700 hover:bg-rose-800 dark:bg-rose-700 dark:hover:bg-rose-600"
              onClick={() => setDeleteStep(2)}
            >
              {t('yes')}
            </Button>
          </div>
        }
      >
        <p className="text-sm text-stone-600 dark:text-slate-300">{t('usersDeleteStep1.hint')}</p>
      </ModalShell>

      <ModalShell
        open={deleteTarget !== null && deleteStep === 2}
        onClose={closeDelete}
        title={t('usersDeleteStep2.title')}
        subtitle={t('usersDeleteStep2.body')}
        size="md"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={closeDelete} disabled={busy}>
              {t('cancel')}
            </Button>
            <Button
              className="bg-rose-700 hover:bg-rose-800 dark:bg-rose-700 dark:hover:bg-rose-600"
              disabled={busy || !deleteEmail.trim() || deletePhrase.trim().toUpperCase() !== ADMIN_USER_SOFT_DELETE_PHRASE}
              onClick={() => void executeSoftDelete()}
            >
              {busy ? t('loading') : t('usersDeleteConfirm')}
            </Button>
          </div>
        }
      >
        <div className="grid gap-4">
          <p className="text-sm text-stone-600 dark:text-slate-300">
            {t('usersDeleteStep2.emailHint', { email: deleteTarget?.email ?? '' })}
          </p>
          <FormField label={t('usersDeleteStep2.emailLabel')}>
            <Input
              type="email"
              value={deleteEmail}
              onChange={(e) => setDeleteEmail(e.target.value)}
              autoComplete="off"
            />
          </FormField>
          <FormField label={t('usersDeleteStep2.phraseLabel', { phrase: ADMIN_USER_SOFT_DELETE_PHRASE })}>
            <Input value={deletePhrase} onChange={(e) => setDeletePhrase(e.target.value)} autoComplete="off" />
          </FormField>
        </div>
      </ModalShell>
    </div>
  );
}
