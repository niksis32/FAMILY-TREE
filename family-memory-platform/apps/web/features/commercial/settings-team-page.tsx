'use client';

import { useEffect, useState } from 'react';
import type { AuditLogEntry, WorkspaceInviteSummary, WorkspaceMemberSummary } from '@family/shared';
import { PageHeader, Card, Button, Input, Select } from '@/components/ui';
import { api, formatApiError } from '@/lib/api-client';
import { useWorkspaceCommercial } from './use-workspace-commercial';

export function SettingsTeamPage() {
  const { token, workspaceId, overview, error, loading } = useWorkspaceCommercial();
  const [members, setMembers] = useState<WorkspaceMemberSummary[]>([]);
  const [invites, setInvites] = useState<WorkspaceInviteSummary[]>([]);
  const [audit, setAudit] = useState<AuditLogEntry[]>([]);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('EDITOR');
  const [lastToken, setLastToken] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  async function loadTeam() {
    if (!token || !workspaceId) return;
    const [m, i, a] = await Promise.all([
      api.commercial.members(workspaceId, token),
      api.commercial.invites(workspaceId, token),
      api.commercial.auditLogs(workspaceId, token),
    ]);
    setMembers(m);
    setInvites(i);
    setAudit(a);
  }

  useEffect(() => {
    void loadTeam().catch(() => undefined);
  }, [token, workspaceId]);

  async function sendInvite() {
    if (!token || !workspaceId) return;
    setStatus(null);
    try {
      const res = await api.commercial.createInvite(workspaceId, { email, role }, token);
      setLastToken(res.acceptToken);
      setStatus('Приглашение создано. Скопируйте токен для принятия (email-рассылка — позже).');
      setEmail('');
      await loadTeam();
    } catch (e) {
      setStatus(formatApiError(e));
    }
  }

  if (loading) return <p className="text-sm text-stone-500">Загрузка…</p>;
  if (error) return <p className="text-sm text-red-600">{error}</p>;

  const isOwner = overview?.memberRole === 'OWNER';

  return (
    <div className="space-y-8">
      <PageHeader
        title="Команда и приглашения"
        description="Workspace members, invite по email и лента audit log."
      />
      <Card>
        <h2 className="text-lg font-semibold">Участники</h2>
        <ul className="mt-4 space-y-2 text-sm">
          {members.map((m) => (
            <li key={m.id} className="flex justify-between border-b border-stone-100 py-2 dark:border-slate-800">
              <span>
                {m.displayName ?? m.email} — {m.role}
              </span>
              <span className="text-stone-500">{new Date(m.joinedAt).toLocaleDateString()}</span>
            </li>
          ))}
        </ul>
      </Card>
      {isOwner ? (
        <Card>
          <h2 className="text-lg font-semibold">Пригласить</h2>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@family.local" />
            <Select value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="EDITOR">Editor</option>
              <option value="VIEWER">Viewer</option>
              <option value="OWNER">Owner</option>
            </Select>
            <Button type="button" onClick={() => void sendInvite()}>
              Отправить
            </Button>
          </div>
          {lastToken ? (
            <p className="mt-3 break-all text-xs text-amber-700 dark:text-amber-300">Accept token: {lastToken}</p>
          ) : null}
        </Card>
      ) : null}
      <Card>
        <h2 className="text-lg font-semibold">Ожидающие приглашения</h2>
        <ul className="mt-4 space-y-2 text-sm">
          {invites.map((i) => (
            <li key={i.id}>
              {i.email} — {i.role} — {i.status}
            </li>
          ))}
        </ul>
      </Card>
      <Card>
        <h2 className="text-lg font-semibold">Audit log</h2>
        <ul className="mt-4 max-h-80 space-y-2 overflow-y-auto text-xs">
          {audit.map((a) => (
            <li key={a.id} className="border-b border-stone-100 py-2 dark:border-slate-800">
              <span className="font-mono text-stone-500">{a.createdAt}</span> — {a.action} ({a.entityType})
            </li>
          ))}
        </ul>
      </Card>
      {status ? <p className="text-sm">{status}</p> : null}
    </div>
  );
}
