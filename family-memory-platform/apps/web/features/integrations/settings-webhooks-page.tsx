'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { WEBHOOK_EVENT_TYPES, type WebhookEndpointSummary, type WebhookEventSummary } from '@family/shared';
import { PageHeader, Card, Button, Input } from '@/components/ui';
import { apiClient, formatApiError } from '@/lib/api-client';
import { useWorkspaceCommercial } from '@/features/commercial/use-workspace-commercial';

const URL_PATTERN = /^https:\/\/.+/i;

export function SettingsWebhooksPage() {
  const t = useTranslations('block5.webhooks');
  const { token, loading, error: workspaceError } = useWorkspaceCommercial();
  const [step, setStep] = useState(1);
  const [endpoints, setEndpoints] = useState<WebhookEndpointSummary[]>([]);
  const [events, setEvents] = useState<WebhookEventSummary[]>([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [url, setUrl] = useState('https://example.com/hooks/family-memory');
  const [description, setDescription] = useState('');
  const [selectedEvents, setSelectedEvents] = useState<string[]>(['PERSON_CREATED']);
  const [status, setStatus] = useState<string | null>(null);
  const [createdSecret, setCreatedSecret] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setStatus(null);
    try {
      const query = statusFilter ? `status=${encodeURIComponent(statusFilter)}` : undefined;
      const [eps, ev] = await Promise.all([
        apiClient.webhooks.listEndpoints(token),
        apiClient.webhooks.listEvents(token, query),
      ]);
      setEndpoints(eps);
      setEvents(ev.items ?? []);
    } catch (e) {
      setStatus(formatApiError(e));
    }
  }, [token, statusFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  function toggleEvent(type: string) {
    setSelectedEvents((prev) =>
      prev.includes(type) ? prev.filter((x) => x !== type) : [...prev, type],
    );
  }

  async function createEndpoint() {
    if (!token || selectedEvents.length === 0) return;
    if (!URL_PATTERN.test(url.trim())) {
      setStatus(t('urlHint'));
      return;
    }
    setStatus(null);
    setCreatedSecret(null);
    try {
      const result = await apiClient.webhooks.createEndpoint(
        { url, description: description || undefined, subscribedEvents: selectedEvents },
        token,
      );
      setCreatedSecret(result.secret);
      setStatus(t('created'));
      setStep(3);
      await load();
    } catch (e) {
      setStatus(formatApiError(e));
    }
  }

  async function testEndpoint(id: string) {
    if (!token) return;
    try {
      await apiClient.webhooks.testEndpoint(id, token);
      setStatus(t('testSent'));
      await load();
    } catch (e) {
      setStatus(formatApiError(e));
    }
  }

  async function retryEvent(id: string) {
    if (!token) return;
    try {
      await apiClient.webhooks.retryEvent(id, token);
      setStatus(t('retryQueued'));
      await load();
    } catch (e) {
      setStatus(formatApiError(e));
    }
  }

  if (loading) return <p className="text-sm text-stone-500">{t('loading')}</p>;
  if (workspaceError) return <p className="text-sm text-red-600">{workspaceError}</p>;

  return (
    <div className="space-y-8">
      <PageHeader title={t('title')} description={t('description')} />

      <Card>
        <div className="flex gap-2 text-xs">
          {[1, 2, 3].map((n) => (
            <span
              key={n}
              className={`rounded-full px-3 py-1 ${step === n ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900' : 'bg-stone-100 dark:bg-slate-800'}`}
            >
              {t(`wizardStep${n}`)}
            </span>
          ))}
        </div>

        {step === 1 ? (
          <div className="mt-4 space-y-3">
            <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://" />
            <p className="text-xs text-stone-500">{t('urlHint')}</p>
            <Button type="button" onClick={() => setStep(2)} disabled={!URL_PATTERN.test(url.trim())}>
              {t('next')}
            </Button>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="mt-4 space-y-3">
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('descriptionField')}
            />
            <div className="flex flex-wrap gap-2">
              {WEBHOOK_EVENT_TYPES.filter((e) => e !== 'PING').map((type) => (
                <button
                  key={type}
                  type="button"
                  className={`rounded-full border px-3 py-1 text-xs ${selectedEvents.includes(type) ? 'border-stone-900 bg-stone-900 text-white dark:border-stone-100 dark:bg-stone-100 dark:text-stone-900' : 'border-stone-300'}`}
                  onClick={() => toggleEvent(type)}
                >
                  {type}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="secondary" onClick={() => setStep(1)}>
                {t('back')}
              </Button>
              <Button type="button" onClick={() => void createEndpoint()} disabled={selectedEvents.length === 0}>
                {t('create')}
              </Button>
            </div>
          </div>
        ) : null}

        {step === 3 && createdSecret ? (
          <p className="mt-4 rounded bg-amber-50 p-3 text-xs text-amber-900 dark:bg-amber-950 dark:text-amber-100">
            {t('secretOnce')}: <code>{createdSecret}</code>
          </p>
        ) : null}
      </Card>

      <Card>
        <h2 className="text-lg font-semibold">{t('endpoints')}</h2>
        {endpoints.length === 0 ? (
          <p className="mt-2 text-sm text-stone-500">{t('noEndpoints')}</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {endpoints.map((ep) => (
              <li key={ep.id} className="rounded border p-3 text-sm dark:border-slate-700">
                <p className="font-medium">{ep.url}</p>
                <p className="text-stone-500">{ep.subscribedEvents.join(', ')}</p>
                {ep.status === 'DISABLED' ? (
                  <p className="mt-1 text-xs text-red-600">{t('disabled')}</p>
                ) : null}
                <Button className="mt-2" type="button" variant="secondary" onClick={() => void testEndpoint(ep.id)}>
                  {t('test')}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">{t('recentEvents')}</h2>
          <select
            className="rounded border px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">{t('allStatuses')}</option>
            {['DELIVERED', 'FAILED', 'RETRYING', 'PENDING', 'DEAD_LETTER'].map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        {events.length === 0 ? (
          <p className="mt-2 text-sm text-stone-500">{t('noEvents')}</p>
        ) : (
          <ul className="mt-4 max-h-64 space-y-2 overflow-auto text-sm">
            {events.map((ev) => (
              <li key={ev.id} className="flex items-center justify-between gap-2 border-b pb-2 dark:border-slate-800">
                <span>
                  {ev.eventType} — {ev.status}
                </span>
                {ev.status === 'FAILED' || ev.status === 'DEAD_LETTER' ? (
                  <Button type="button" variant="secondary" onClick={() => void retryEvent(ev.id)}>
                    {t('retry')}
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </Card>

      {status ? <p className="text-sm text-stone-600 dark:text-stone-300">{status}</p> : null}
    </div>
  );
}
