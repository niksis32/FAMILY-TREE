'use client';

import { useEffect, useState } from 'react';
import type { PersonPrivacySettings } from '@family/shared';
import { Button, Card, Select } from '@/components/ui';
import { api, formatApiError } from '@/lib/api-client';

export function PersonPrivacySettings({ personId, token }: { personId: string; token: string }) {
  const [settings, setSettings] = useState<PersonPrivacySettings | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    void api.privacy.personSettings(personId, token).then(setSettings).catch(() => undefined);
  }, [personId, token]);

  async function save() {
    if (!settings) return;
    try {
      const next = await api.privacy.updatePerson(
        personId,
        { privacyLevel: settings.privacyLevel, isLiving: settings.isLiving },
        token,
      );
      setSettings(next);
      setStatus('Настройки персоны сохранены.');
    } catch (e) {
      setStatus(formatApiError(e));
    }
  }

  if (!settings) return null;

  return (
    <Card>
      <h3 className="text-lg font-semibold">Приватность персоны</h3>
      <p className="mt-1 text-sm text-stone-600">ID: {personId}</p>
      <div className="mt-4 space-y-3">
        <label className="block text-sm">
          Уровень приватности
          <Select
            className="mt-1"
            value={settings.privacyLevel}
            onChange={(e) => setSettings({ ...settings, privacyLevel: e.target.value })}
          >
            <option value="PRIVATE">PRIVATE</option>
            <option value="FAMILY">FAMILY</option>
            <option value="PUBLIC">PUBLIC</option>
          </Select>
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={settings.isLiving}
            onChange={(e) => setSettings({ ...settings, isLiving: e.target.checked })}
          />
          Живой человек
        </label>
        <Button type="button" onClick={() => void save()}>
          Сохранить
        </Button>
      </div>
      {status ? <p className="mt-3 text-sm">{status}</p> : null}
    </Card>
  );
}
