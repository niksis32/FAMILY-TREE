'use client';

import { useCallback, useEffect, useState } from 'react';
import type { PrivacySecurityCenterState } from '@family/shared';
import { PageHeader, Card, Button } from '@/components/ui';
import { api, formatApiError } from '@/lib/api-client';
import { useAuth } from '@/components/auth-provider';
import { AccessLogViewer } from './access-log-viewer';
import { PublicLinkManager } from './public-link-manager';
import { PersonPrivacySettings } from './person-privacy-settings';
import { TreePrivacySettings } from './tree-privacy-settings';

const CONSENT_LABELS: Record<string, string> = {
  GDPR_DATA_PROCESSING: 'Обработка персональных данных (GDPR)',
  GLOBAL_MATCHING: 'Глобальный matching родственников',
  AI_LOCAL_PROCESSING: 'Локальная AI-обработка архивов',
};

export function PrivacyCenterPage() {
  const { session } = useAuth();
  const token = session?.accessToken ?? null;
  const [center, setCenter] = useState<PrivacySecurityCenterState | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const personId = 'seed-person-ivan';
  const familyId = 'seed-family-petrov';

  const load = useCallback(async () => {
    if (!token) return;
    setCenter(await api.privacy.securityCenter(token));
  }, [token]);

  useEffect(() => {
    void load().catch(() => undefined);
  }, [load]);

  async function toggleConsent(consentKey: string, granted: boolean) {
    if (!token) return;
    try {
      const next = await api.privacy.updateConsent({ consentKey, granted }, token);
      setCenter(next);
      setStatus('Согласие обновлено.');
    } catch (e) {
      setStatus(formatApiError(e));
    }
  }

  async function downloadGdpr() {
    if (!token) return;
    try {
      const workspaces = await api.commercial.myWorkspaces(token);
      const ws = workspaces[0]?.id;
      if (!ws) {
        setStatus('Workspace не найден.');
        return;
      }
      const bundle = await api.commercial.exportGdpr(ws, token);
      const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `gdpr-export-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setStatus('JSON экспорт скачан.');
    } catch (e) {
      setStatus(formatApiError(e));
    }
  }

  async function requestExport() {
    if (!token) return;
    try {
      await api.commercial.requestExport(token);
      await load();
      setStatus('Запрос на экспорт зарегистрирован.');
    } catch (e) {
      setStatus(formatApiError(e));
    }
  }

  async function deleteAccount() {
    if (!token) return;
    if (!window.confirm('Удалить аккаунт безвозвратно? Данные будут анонимизированы.')) return;
    try {
      await api.privacy.accountDelete(token);
      setStatus('Аккаунт удалён. Выйдите из сессии.');
    } catch (e) {
      setStatus(formatApiError(e));
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Privacy & Security Center"
        description="Приватность персон и дерева, публичные ссылки, журнал доступа, GDPR."
      />

      <Card>
        <h2 className="text-lg font-semibold">Согласия</h2>
        <ul className="mt-4 space-y-3">
          {center?.consents.map((c) => (
            <li key={c.consentKey} className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm">{CONSENT_LABELS[c.consentKey] ?? c.consentKey}</span>
              <Button type="button" onClick={() => void toggleConsent(c.consentKey, !c.granted)}>
                {c.granted ? 'Отозвать' : 'Принять'}
              </Button>
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <h2 className="text-lg font-semibold">Экспорт и удаление</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button type="button" onClick={() => void requestExport()}>
            Запросить экспорт
          </Button>
          <Button type="button" onClick={() => void downloadGdpr()}>
            Скачать GDPR JSON
          </Button>
          <Button type="button" onClick={() => void deleteAccount()}>
            Удалить аккаунт
          </Button>
        </div>
        <ul className="mt-6 space-y-2 text-sm">
          {center?.requests.map((r) => (
            <li key={r.id}>
              {r.type} — {r.status} — {new Date(r.createdAt).toLocaleString()}
            </li>
          ))}
        </ul>
      </Card>

      {token ? (
        <>
          <PublicLinkManager shares={center?.publicShares ?? []} token={token} onRefresh={() => void load()} />
          <AccessLogViewer logs={center?.recentAccessLogs ?? []} />
          {personId ? <PersonPrivacySettings personId={personId} token={token} /> : null}
          {familyId ? <TreePrivacySettings familyId={familyId} token={token} /> : null}
        </>
      ) : null}

      <p className="text-xs text-stone-500">
        Демо ID: персона {personId}, семья {familyId} (из seed).
      </p>

      {status ? <p className="text-sm">{status}</p> : null}
    </div>
  );
}
