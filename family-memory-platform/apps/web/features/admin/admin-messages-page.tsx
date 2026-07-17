'use client';

import { useCallback, useEffect, useState } from 'react';
import { Download, EyeOff, Flag, RefreshCw, Search } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { ModalShell } from '@family/ui';
import type {
  AdminMessageExportResponse,
  AdminMessageReportListResponse,
  AdminMessageReportSummary,
  AdminMessengerConversationListResponse,
  AdminMessengerConversationSummary,
  AdminMessengerMessageListResponse,
  AdminMessengerSanctionListResponse,
  AdminMessengerStatsResponse,
} from '@family/shared';
import { useAuth } from '@/components/auth-provider';
import { Badge, Button, Card, FormField, Input, StatCard } from '@/components/ui';
import { apiClient, formatApiError } from '@/lib/api-client';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 25;

type Tab = 'conversations' | 'reports' | 'sanctions';

function conversationLabel(row: AdminMessengerConversationSummary) {
  if (row.title) return row.title;
  if (row.type === 'DIRECT') {
    return row.participants.map((p) => p.displayName ?? p.email).join(' · ');
  }
  return row.type;
}

export function AdminMessagesPage() {
  const { session } = useAuth();
  const t = useTranslations('adminPanel.messages');
  const [tab, setTab] = useState<Tab>('conversations');
  const [stats, setStats] = useState<AdminMessengerStatsResponse | null>(null);
  const [conversations, setConversations] = useState<AdminMessengerConversationListResponse | null>(null);
  const [reports, setReports] = useState<AdminMessageReportListResponse | null>(null);
  const [sanctions, setSanctions] = useState<AdminMessengerSanctionListResponse | null>(null);
  const [search, setSearch] = useState('');
  const [searchApplied, setSearchApplied] = useState('');
  const [offset, setOffset] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  const [detailId, setDetailId] = useState<string | null>(null);
  const [detailMessages, setDetailMessages] = useState<AdminMessengerMessageListResponse | null>(null);
  const [resolveTarget, setResolveTarget] = useState<AdminMessageReportSummary | null>(null);
  const [revokeSanctionId, setRevokeSanctionId] = useState<string | null>(null);
  const [hideTargetId, setHideTargetId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!session?.accessToken) return;
    setLoading(true);
    setError('');
    try {
      const statsResult = await apiClient.admin.messageStats(session.accessToken);
      setStats(statsResult);

      if (tab === 'conversations') {
        const result = await apiClient.admin.searchConversations(session.accessToken, {
          q: searchApplied || undefined,
          limit: PAGE_SIZE,
          offset,
        });
        setConversations(result);
      } else if (tab === 'reports') {
        const result = await apiClient.admin.listMessageReports(session.accessToken, {
          limit: PAGE_SIZE,
          offset,
        });
        setReports(result);
      } else {
        const result = await apiClient.admin.listMessengerSanctions(session.accessToken, {
          limit: PAGE_SIZE,
          offset,
        });
        setSanctions(result);
      }
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setLoading(false);
    }
  }, [offset, searchApplied, session?.accessToken, tab]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setOffset(0);
  }, [tab, searchApplied]);

  async function openDetail(conversationId: string) {
    if (!session?.accessToken) return;
    setDetailId(conversationId);
    setDetailMessages(null);
    try {
      const messages = await apiClient.admin.listConversationMessages(session.accessToken, conversationId, {
        limit: 200,
        includeDeleted: true,
      });
      setDetailMessages(messages);
    } catch (err) {
      setError(formatApiError(err));
    }
  }

  async function exportConversation(conversationId: string) {
    if (!session?.accessToken) return;
    setBusy(true);
    try {
      const data: AdminMessageExportResponse = await apiClient.admin.exportConversation(
        session.accessToken,
        conversationId,
      );
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `conversation-${conversationId}-${Date.now()}.json`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setBusy(false);
    }
  }

  async function confirmHideMessage() {
    if (!session?.accessToken || !hideTargetId) return;
    setBusy(true);
    try {
      await apiClient.admin.hideMessage(session.accessToken, hideTargetId, 'admin_hide');
      setHideTargetId(null);
      if (detailId) await openDetail(detailId);
      await load();
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setBusy(false);
    }
  }

  async function confirmResolveReport(action: 'resolve' | 'dismiss') {
    if (!session?.accessToken || !resolveTarget) return;
    setBusy(true);
    try {
      await apiClient.admin.resolveMessageReport(session.accessToken, resolveTarget.id, {
        status: action === 'resolve' ? 'RESOLVED' : 'DISMISSED',
        hideMessage: action === 'resolve',
        applySendBlock: action === 'resolve',
        blockScope: 'WORKSPACE',
      });
      setResolveTarget(null);
      await load();
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setBusy(false);
    }
  }

  async function confirmRevokeSanction() {
    if (!session?.accessToken || !revokeSanctionId) return;
    setBusy(true);
    try {
      await apiClient.admin.revokeMessengerSanction(session.accessToken, revokeSanctionId);
      setRevokeSanctionId(null);
      await load();
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setBusy(false);
    }
  }

  const pageData = tab === 'conversations' ? conversations : tab === 'reports' ? reports : sanctions;
  const canPrev = offset > 0;
  const canNext = pageData ? offset + PAGE_SIZE < pageData.total : false;

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <h2 className="font-serif text-xl font-semibold">{t('title')}</h2>
        <p className="mt-1 text-sm text-stone-500 dark:text-slate-400">{t('hint')}</p>
      </Card>

      {stats ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label={t('stats.conversations')} value={String(stats.totalConversations)} hint={t('stats.conversationsHint')} />
          <StatCard label={t('stats.messages24h')} value={String(stats.messages24h)} hint={t('stats.messages24hHint')} />
          <StatCard label={t('stats.openReports')} value={String(stats.openMessageReports)} hint={t('stats.openReportsHint')} />
          <StatCard label={t('stats.sanctions')} value={String(stats.activeSanctions)} hint={t('stats.sanctionsHint')} />
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button variant={tab === 'conversations' ? 'primary' : 'secondary'} onClick={() => setTab('conversations')}>
          {t('tabs.conversations')}
        </Button>
        <Button variant={tab === 'reports' ? 'primary' : 'secondary'} onClick={() => setTab('reports')}>
          {t('tabs.reports')}
        </Button>
        <Button variant={tab === 'sanctions' ? 'primary' : 'secondary'} onClick={() => setTab('sanctions')}>
          {t('tabs.sanctions')}
        </Button>
        <Button variant="secondary" className="ml-auto gap-2" onClick={() => void load()} disabled={loading}>
          <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} aria-hidden />
          {t('refresh')}
        </Button>
      </div>

      {tab === 'conversations' ? (
        <form
          className="flex flex-wrap gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            setSearchApplied(search.trim());
          }}
        >
          <FormField label={t('searchLabel')} className="min-w-[16rem] flex-1">
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('searchPlaceholder')} />
          </FormField>
          <Button type="submit" className="mt-6 gap-2 self-end">
            <Search className="h-4 w-4" aria-hidden />
            {t('searchAction')}
          </Button>
        </form>
      ) : null}

      {error ? <p className="text-sm text-rose-600">{error}</p> : null}

      {tab === 'conversations' ? (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] text-left text-sm">
              <thead className="border-b bg-stone-50/80 text-xs uppercase tracking-wide text-stone-500 dark:bg-slate-900/60">
                <tr>
                  <th className="px-4 py-3">{t('table.conversation')}</th>
                  <th className="px-4 py-3">{t('table.workspace')}</th>
                  <th className="px-4 py-3">{t('table.participants')}</th>
                  <th className="px-4 py-3">{t('table.messages')}</th>
                  <th className="px-4 py-3">{t('table.lastActivity')}</th>
                  <th className="px-4 py-3 text-right">{t('table.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {loading && !conversations ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-stone-500">
                      {t('loading')}
                    </td>
                  </tr>
                ) : null}
                {conversations?.items.map((row) => (
                  <tr key={row.id} className="border-b border-stone-100 dark:border-slate-800">
                    <td className="px-4 py-3">
                      <p className="font-medium">{conversationLabel(row)}</p>
                      <p className="text-xs text-stone-500">{row.type}{row.lastMessagePreview ? ` · ${row.lastMessagePreview}` : ''}</p>
                    </td>
                    <td className="px-4 py-3">{row.workspaceName}</td>
                    <td className="px-4 py-3">{row.participantCount}</td>
                    <td className="px-4 py-3">{row.messageCount}</td>
                    <td className="px-4 py-3 text-stone-500">{new Date(row.lastMessageAt).toLocaleString('ru-RU')}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Button variant="secondary" className="h-8 px-2.5" onClick={() => void openDetail(row.id)}>
                          {t('view')}
                        </Button>
                        <Button variant="ghost" className="h-8 px-2.5" onClick={() => void exportConversation(row.id)} disabled={busy}>
                          <Download className="h-3.5 w-3.5" aria-hidden />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {conversations && conversations.items.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-stone-500">
                      {t('emptyConversations')}
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </Card>
      ) : null}

      {tab === 'reports' ? (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] text-left text-sm">
              <thead className="border-b bg-stone-50/80 text-xs uppercase tracking-wide text-stone-500 dark:bg-slate-900/60">
                <tr>
                  <th className="px-4 py-3">{t('reports.time')}</th>
                  <th className="px-4 py-3">{t('reports.category')}</th>
                  <th className="px-4 py-3">{t('reports.message')}</th>
                  <th className="px-4 py-3">{t('reports.reporter')}</th>
                  <th className="px-4 py-3 text-right">{t('table.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {reports?.items.map((row) => (
                  <tr key={row.id} className="border-b border-stone-100 dark:border-slate-800">
                    <td className="px-4 py-3 text-stone-500">{new Date(row.createdAt).toLocaleString('ru-RU')}</td>
                    <td className="px-4 py-3">
                      <Badge tone="red">{row.category}</Badge>
                    </td>
                    <td className="px-4 py-3 max-w-md">
                      <p className="line-clamp-2 text-stone-700 dark:text-slate-200">{row.message?.bodyPreview ?? '—'}</p>
                      <p className="text-xs text-stone-500">{row.message?.workspaceName ?? ''}</p>
                    </td>
                    <td className="px-4 py-3">{row.reporter.displayName ?? row.reporter.email}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        {row.message ? (
                          <Button variant="secondary" className="h-8 px-2.5" onClick={() => void openDetail(row.message!.conversationId)}>
                            {t('view')}
                          </Button>
                        ) : null}
                        <Button variant="secondary" className="h-8 gap-1.5 px-2.5" onClick={() => setResolveTarget(row)}>
                          <Flag className="h-3.5 w-3.5" aria-hidden />
                          {t('review')}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {reports && reports.items.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-stone-500">
                      {t('emptyReports')}
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </Card>
      ) : null}

      {tab === 'sanctions' ? (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-left text-sm">
              <thead className="border-b bg-stone-50/80 text-xs uppercase tracking-wide text-stone-500 dark:bg-slate-900/60">
                <tr>
                  <th className="px-4 py-3">{t('sanctions.user')}</th>
                  <th className="px-4 py-3">{t('sanctions.scope')}</th>
                  <th className="px-4 py-3">{t('sanctions.reason')}</th>
                  <th className="px-4 py-3">{t('sanctions.expires')}</th>
                  <th className="px-4 py-3 text-right">{t('table.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {sanctions?.items.map((row) => (
                  <tr key={row.id} className="border-b border-stone-100 dark:border-slate-800">
                    <td className="px-4 py-3">
                      <p className="font-medium">{row.userDisplayName ?? row.userEmail}</p>
                      <p className="font-mono text-xs text-stone-500">{row.userEmail}</p>
                    </td>
                    <td className="px-4 py-3">{row.workspaceName ?? t('sanctions.platformWide')}</td>
                    <td className="px-4 py-3">{row.reason ?? '—'}</td>
                    <td className="px-4 py-3 text-stone-500">
                      {row.expiresAt ? new Date(row.expiresAt).toLocaleString('ru-RU') : t('sanctions.permanent')}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {row.isActive ? (
                        <Button variant="secondary" className="h-8 px-2.5" onClick={() => setRevokeSanctionId(row.id)}>
                          {t('sanctions.revoke')}
                        </Button>
                      ) : (
                        <Badge tone="muted">{t('sanctions.revoked')}</Badge>
                      )}
                    </td>
                  </tr>
                ))}
                {sanctions && sanctions.items.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-stone-500">
                      {t('emptySanctions')}
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </Card>
      ) : null}

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
        open={detailId !== null}
        onClose={() => setDetailId(null)}
        title={t('detailTitle')}
        subtitle={t('detailHint')}
        size="xl"
        footer={
          detailId ? (
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => void exportConversation(detailId)} disabled={busy}>
                <Download className="mr-2 h-4 w-4" aria-hidden />
                {t('export')}
              </Button>
              <Button variant="secondary" onClick={() => setDetailId(null)}>
                {t('close')}
              </Button>
            </div>
          ) : null
        }
      >
        {!detailMessages ? (
          <p className="text-sm text-stone-500">{t('loading')}</p>
        ) : (
          <div className="max-h-[50vh] space-y-3 overflow-y-auto">
            {detailMessages.items.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  'rounded-2xl border px-4 py-3',
                  msg.isHidden ? 'border-rose-200 bg-rose-50/50 dark:border-rose-900 dark:bg-rose-950/20' : 'border-stone-200 dark:border-slate-800',
                )}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold">{msg.senderName ?? msg.senderEmail}</p>
                  <p className="text-xs text-stone-500">{new Date(msg.createdAt).toLocaleString('ru-RU')}</p>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm">{msg.body}</p>
                <div className="mt-2 flex items-center gap-2">
                  {msg.isHidden ? <Badge tone="red">{t('hidden')}</Badge> : null}
                  {!msg.isHidden ? (
                    <Button variant="ghost" className="h-7 gap-1 px-2 text-xs text-rose-700" onClick={() => setHideTargetId(msg.id)}>
                      <EyeOff className="h-3 w-3" aria-hidden />
                      {t('hideMessage')}
                    </Button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </ModalShell>

      <ModalShell
        open={resolveTarget !== null}
        onClose={() => {
          if (!busy) setResolveTarget(null);
        }}
        title={t('resolveConfirm.title')}
        subtitle={t('resolveConfirm.subtitle')}
        size="md"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setResolveTarget(null)} disabled={busy}>
              {t('no')}
            </Button>
            <Button variant="secondary" onClick={() => void confirmResolveReport('dismiss')} disabled={busy}>
              {t('dismiss')}
            </Button>
            <Button className="bg-rose-700 hover:bg-rose-800" disabled={busy} onClick={() => void confirmResolveReport('resolve')}>
              {busy ? t('loading') : t('resolveAndBlock')}
            </Button>
          </div>
        }
      >
        <p className="text-sm text-stone-600 dark:text-slate-300">{t('resolveConfirm.body')}</p>
        {resolveTarget?.message ? (
          <p className="mt-3 rounded-xl bg-stone-50 p-3 text-sm dark:bg-slate-900">{resolveTarget.message.bodyPreview}</p>
        ) : null}
      </ModalShell>

      <ModalShell
        open={hideTargetId !== null}
        onClose={() => {
          if (!busy) setHideTargetId(null);
        }}
        title={t('hideConfirm.title')}
        size="md"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setHideTargetId(null)} disabled={busy}>
              {t('no')}
            </Button>
            <Button className="bg-rose-700 hover:bg-rose-800" disabled={busy} onClick={() => void confirmHideMessage()}>
              {busy ? t('loading') : t('yes')}
            </Button>
          </div>
        }
      >
        <p className="text-sm text-stone-600 dark:text-slate-300">{t('hideConfirm.body')}</p>
      </ModalShell>

      <ModalShell
        open={revokeSanctionId !== null}
        onClose={() => {
          if (!busy) setRevokeSanctionId(null);
        }}
        title={t('revokeSanction.title')}
        size="md"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setRevokeSanctionId(null)} disabled={busy}>
              {t('no')}
            </Button>
            <Button disabled={busy} onClick={() => void confirmRevokeSanction()}>
              {busy ? t('loading') : t('yes')}
            </Button>
          </div>
        }
      >
        <p className="text-sm text-stone-600 dark:text-slate-300">{t('revokeSanction.body')}</p>
      </ModalShell>
    </div>
  );
}
