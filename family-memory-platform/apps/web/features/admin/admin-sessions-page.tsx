'use client';

import { useCallback, useEffect, useState } from 'react';
import { LogOut, RefreshCw, ShieldAlert } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { ModalShell } from '@family/ui';
import type {
  AdminLoginEventListResponse,
  AdminSessionListResponse,
  AdminSessionStatsResponse,
  AdminSessionSummary,
  LoginEventOutcome,
} from '@family/shared';
import { useAuth } from '@/components/auth-provider';
import { Badge, Button, Card, FormField, Input, StatCard } from '@/components/ui';
import { apiClient, formatApiError } from '@/lib/api-client';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 25;

type Tab = 'sessions' | 'loginEvents';

function outcomeTone(outcome: LoginEventOutcome): 'gold' | 'green' | 'red' | 'muted' | 'blue' {
  if (outcome === 'SUCCESS') return 'green';
  if (outcome === 'MFA_CHALLENGE') return 'blue';
  if (outcome === 'FAILURE_INACTIVE') return 'muted';
  return 'red';
}

export function AdminSessionsPage() {
  const { session } = useAuth();
  const t = useTranslations('adminPanel.sessions');
  const [tab, setTab] = useState<Tab>('sessions');
  const [stats, setStats] = useState<AdminSessionStatsResponse | null>(null);
  const [sessions, setSessions] = useState<AdminSessionListResponse | null>(null);
  const [loginEvents, setLoginEvents] = useState<AdminLoginEventListResponse | null>(null);
  const [offset, setOffset] = useState(0);
  const [suspiciousOnly, setSuspiciousOnly] = useState(false);
  const [showRevoked, setShowRevoked] = useState(false);
  const [userFilter, setUserFilter] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<AdminSessionSummary | null>(null);
  const [revokeAllUserId, setRevokeAllUserId] = useState<{ id: string; label: string } | null>(null);

  const load = useCallback(async () => {
    if (!session?.accessToken) return;
    setLoading(true);
    setError('');
    try {
      const statsResult = await apiClient.admin.sessionStats(session.accessToken);
      setStats(statsResult);

      if (tab === 'sessions') {
        const result = await apiClient.admin.sessions(session.accessToken, {
          limit: PAGE_SIZE,
          offset,
          activeOnly: !showRevoked,
        });
        setSessions(result);
      } else {
        const result = await apiClient.admin.loginEvents(session.accessToken, {
          limit: PAGE_SIZE,
          offset,
          suspiciousOnly,
        });
        setLoginEvents(result);
      }
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setLoading(false);
    }
  }, [offset, session?.accessToken, showRevoked, suspiciousOnly, tab]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setOffset(0);
  }, [tab, suspiciousOnly, showRevoked]);

  async function confirmRevokeSession() {
    if (!session?.accessToken || !revokeTarget) return;
    setBusy(true);
    setError('');
    try {
      await apiClient.admin.revokeSession(session.accessToken, revokeTarget.id, 'admin_revoke');
      setRevokeTarget(null);
      await load();
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setBusy(false);
    }
  }

  async function confirmRevokeAll() {
    if (!session?.accessToken || !revokeAllUserId) return;
    setBusy(true);
    setError('');
    try {
      await apiClient.admin.revokeAllUserSessions(session.accessToken, revokeAllUserId.id);
      setRevokeAllUserId(null);
      await load();
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setBusy(false);
    }
  }

  const pageData = tab === 'sessions' ? sessions : loginEvents;
  const canPrev = offset > 0;
  const canNext = pageData ? offset + PAGE_SIZE < pageData.total : false;

  const filteredSessions = sessions?.items.filter((row) => {
    if (!userFilter.trim()) return true;
    const q = userFilter.trim().toLowerCase();
    return (
      row.userEmail.toLowerCase().includes(q) ||
      (row.userDisplayName?.toLowerCase().includes(q) ?? false) ||
      (row.ipAddress?.includes(q) ?? false)
    );
  });

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <h2 className="font-serif text-xl font-semibold">{t('title')}</h2>
        <p className="mt-1 text-sm text-stone-500 dark:text-slate-400">{t('hint')}</p>
      </Card>

      {stats ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label={t('stats.activeSessions')} value={String(stats.activeSessions)} hint={t('stats.activeSessionsHint')} />
          <StatCard label={t('stats.activeUsers')} value={String(stats.activeUsers)} hint={t('stats.activeUsersHint')} />
          <StatCard label={t('stats.failedLogins24h')} value={String(stats.failedLogins24h)} hint={t('stats.failedLogins24hHint')} />
          <StatCard label={t('stats.suspicious24h')} value={String(stats.suspiciousEvents24h)} hint={t('stats.suspicious24hHint')} />
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button variant={tab === 'sessions' ? 'primary' : 'secondary'} onClick={() => setTab('sessions')}>
          {t('tabs.sessions')}
        </Button>
        <Button variant={tab === 'loginEvents' ? 'primary' : 'secondary'} onClick={() => setTab('loginEvents')}>
          {t('tabs.loginEvents')}
        </Button>
        <Button variant="secondary" className="ml-auto gap-2" onClick={() => void load()} disabled={loading}>
          <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} aria-hidden />
          {t('refresh')}
        </Button>
      </div>

      {tab === 'sessions' ? (
        <div className="flex flex-wrap items-end gap-3">
          <FormField label={t('filterUser')} className="min-w-[14rem] flex-1">
            <Input
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
              placeholder={t('filterUserPlaceholder')}
            />
          </FormField>
          <label className="flex items-center gap-2 text-sm text-stone-600 dark:text-slate-300">
            <input type="checkbox" checked={showRevoked} onChange={(e) => setShowRevoked(e.target.checked)} />
            {t('showRevoked')}
          </label>
        </div>
      ) : (
        <label className="flex items-center gap-2 text-sm text-stone-600 dark:text-slate-300">
          <input type="checkbox" checked={suspiciousOnly} onChange={(e) => setSuspiciousOnly(e.target.checked)} />
          {t('suspiciousOnly')}
        </label>
      )}

      {error ? <p className="text-sm text-rose-600">{error}</p> : null}

      {tab === 'sessions' ? (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] text-left text-sm">
              <thead className="border-b bg-stone-50/80 text-xs uppercase tracking-wide text-stone-500 dark:bg-slate-900/60">
                <tr>
                  <th className="px-4 py-3">{t('table.user')}</th>
                  <th className="px-4 py-3">{t('table.device')}</th>
                  <th className="px-4 py-3">{t('table.ip')}</th>
                  <th className="px-4 py-3">{t('table.started')}</th>
                  <th className="px-4 py-3">{t('table.lastSeen')}</th>
                  <th className="px-4 py-3">{t('table.status')}</th>
                  <th className="px-4 py-3 text-right">{t('table.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {loading && !sessions ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-stone-500">
                      {t('loading')}
                    </td>
                  </tr>
                ) : null}
                {filteredSessions?.map((row) => (
                  <tr key={row.id} className="border-b border-stone-100 dark:border-slate-800">
                    <td className="px-4 py-3">
                      <p className="font-medium">{row.userDisplayName ?? '—'}</p>
                      <p className="font-mono text-xs text-stone-500">{row.userEmail}</p>
                    </td>
                    <td className="px-4 py-3">{row.deviceLabel ?? t('unknownDevice')}</td>
                    <td className="px-4 py-3 font-mono text-xs">{row.ipAddress ?? '—'}</td>
                    <td className="px-4 py-3 text-stone-500">{new Date(row.createdAt).toLocaleString('ru-RU')}</td>
                    <td className="px-4 py-3 text-stone-500">{new Date(row.lastSeenAt).toLocaleString('ru-RU')}</td>
                    <td className="px-4 py-3">
                      <Badge tone={row.isActive ? 'green' : 'muted'}>
                        {row.isActive ? t('status.active') : t('status.revoked')}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        {row.isActive ? (
                          <Button
                            variant="secondary"
                            className="h-8 gap-1.5 px-2.5 text-rose-700 dark:text-rose-300"
                            onClick={() => setRevokeTarget(row)}
                          >
                            <LogOut className="h-3.5 w-3.5" aria-hidden />
                            {t('revoke')}
                          </Button>
                        ) : null}
                        {row.isActive ? (
                          <Button
                            variant="ghost"
                            className="h-8 px-2.5 text-xs"
                            onClick={() =>
                              setRevokeAllUserId({
                                id: row.userId,
                                label: row.userDisplayName ?? row.userEmail,
                              })
                            }
                          >
                            {t('revokeAllUser')}
                          </Button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredSessions && filteredSessions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-stone-500">
                      {t('emptySessions')}
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] text-left text-sm">
              <thead className="border-b bg-stone-50/80 text-xs uppercase tracking-wide text-stone-500 dark:bg-slate-900/60">
                <tr>
                  <th className="px-4 py-3">{t('events.time')}</th>
                  <th className="px-4 py-3">{t('events.account')}</th>
                  <th className="px-4 py-3">{t('events.outcome')}</th>
                  <th className="px-4 py-3">{t('events.device')}</th>
                  <th className="px-4 py-3">{t('events.ip')}</th>
                  <th className="px-4 py-3">{t('events.flags')}</th>
                </tr>
              </thead>
              <tbody>
                {loading && !loginEvents ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-stone-500">
                      {t('loading')}
                    </td>
                  </tr>
                ) : null}
                {loginEvents?.items.map((row) => (
                  <tr key={row.id} className="border-b border-stone-100 dark:border-slate-800">
                    <td className="px-4 py-3 text-stone-500">{new Date(row.createdAt).toLocaleString('ru-RU')}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium">{row.userDisplayName ?? row.emailAttempt ?? '—'}</p>
                      {row.userEmail ? <p className="font-mono text-xs text-stone-500">{row.userEmail}</p> : null}
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={outcomeTone(row.outcome)}>{t(`outcomes.${row.outcome}`)}</Badge>
                    </td>
                    <td className="px-4 py-3">{row.deviceLabel ?? t('unknownDevice')}</td>
                    <td className="px-4 py-3 font-mono text-xs">{row.ipAddress ?? '—'}</td>
                    <td className="px-4 py-3">
                      {row.isSuspicious ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-700 dark:text-rose-300">
                          <ShieldAlert className="h-3.5 w-3.5" aria-hidden />
                          {row.suspiciousReason ?? t('events.suspicious')}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                ))}
                {loginEvents && loginEvents.items.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-stone-500">
                      {t('emptyEvents')}
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {pageData ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-stone-500">
            {t('pagination', {
              from: pageData.total === 0 ? 0 : offset + 1,
              to: Math.min(offset + PAGE_SIZE, pageData.total),
              total: pageData.total,
            })}
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
        open={revokeTarget !== null}
        onClose={() => {
          if (!busy) setRevokeTarget(null);
        }}
        title={t('revokeConfirm.title')}
        subtitle={t('revokeConfirm.subtitle', { user: revokeTarget?.userDisplayName ?? revokeTarget?.userEmail ?? '' })}
        size="md"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setRevokeTarget(null)} disabled={busy}>
              {t('no')}
            </Button>
            <Button className="bg-rose-700 hover:bg-rose-800" disabled={busy} onClick={() => void confirmRevokeSession()}>
              {busy ? t('loading') : t('yes')}
            </Button>
          </div>
        }
      >
        <p className="text-sm text-stone-600 dark:text-slate-300">{t('revokeConfirm.body')}</p>
      </ModalShell>

      <ModalShell
        open={revokeAllUserId !== null}
        onClose={() => {
          if (!busy) setRevokeAllUserId(null);
        }}
        title={t('revokeAllConfirm.title')}
        subtitle={t('revokeAllConfirm.subtitle', { user: revokeAllUserId?.label ?? '' })}
        size="md"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setRevokeAllUserId(null)} disabled={busy}>
              {t('no')}
            </Button>
            <Button className="bg-rose-700 hover:bg-rose-800" disabled={busy} onClick={() => void confirmRevokeAll()}>
              {busy ? t('loading') : t('yes')}
            </Button>
          </div>
        }
      >
        <p className="text-sm text-stone-600 dark:text-slate-300">{t('revokeAllConfirm.body')}</p>
      </ModalShell>
    </div>
  );
}
