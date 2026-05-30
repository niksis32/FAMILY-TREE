'use client';

import { useEffect, useState } from 'react';
import type { PrivacyCenterState } from '@family/shared';
import { PageHeader, Card, Button } from '@/components/ui';
import { api, formatApiError } from '@/lib/api-client';
import { useAuth } from '@/components/auth-provider';

export function SettingsPrivacyPage() {
  const { session } = useAuth();
  const token = session?.accessToken ?? null;
  const [center, setCenter] = useState<PrivacyCenterState | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  async function load() {
    if (!token) return;
    setCenter(await api.commercial.privacyCenter(token));
  }

  useEffect(() => {
    void load().catch(() => undefined);
  }, [token]);

  async function toggleMatching() {
    if (!token || !center) return;
    try {
      const next = await api.commercial.updateConsent(!center.matchProfileOptIn, token);
      setCenter(next);
      setStatus('Согласие обновлено.');
    } catch (e) {
      setStatus(formatApiError(e));
    }
  }

  async function requestExport() {
    if (!token) return;
    try {
      await api.commercial.requestExport(token);
      await load();
      setStatus('Запрос на экспорт данных зарегистрирован.');
    } catch (e) {
      setStatus(formatApiError(e));
    }
  }

  async function requestDelete() {
    if (!token) return;
    try {
      await api.commercial.requestDelete(token);
      await load();
      setStatus('Запрос на удаление зарегистрирован (обработка — вручную / позже).');
    } catch (e) {
      setStatus(formatApiError(e));
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Privacy center"
        description="Согласия, GDPR-запросы и opt-in глобального matching."
      />
      <Card>
        <h2 className="text-lg font-semibold">Глобальный matching</h2>
        <p className="mt-2 text-sm text-stone-600">
          Opt-in: {center?.matchProfileOptIn ? 'включён' : 'выключен'}
        </p>
        <Button className="mt-4" type="button" onClick={() => void toggleMatching()}>
          Переключить opt-in
        </Button>
      </Card>
      <Card>
        <h2 className="text-lg font-semibold">Запросы</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button type="button" onClick={() => void requestExport()}>
            Запросить экспорт (GDPR)
          </Button>
          <Button type="button" onClick={() => void requestDelete()}>
            Запросить удаление
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
      {status ? <p className="text-sm">{status}</p> : null}
    </div>
  );
}
