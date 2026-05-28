'use client';

import { useEffect, useState } from 'react';
import type { TreePrivacySettings } from '@family/shared';
import { Button, Card, Select } from '@/components/ui';
import { api, formatApiError } from '@/lib/api-client';

export function TreePrivacySettings({ familyId, token }: { familyId: string; token: string }) {
  const [settings, setSettings] = useState<TreePrivacySettings | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    void api.privacy.treeSettings(familyId, token).then(setSettings).catch(() => undefined);
  }, [familyId, token]);

  async function save() {
    if (!settings) return;
    try {
      const next = await api.privacy.updateTree(
        familyId,
        {
          hideLivingPersons: settings.hideLivingPersons,
          treePrivacyLevel: settings.treePrivacyLevel,
        },
        token,
      );
      setSettings(next);
      setStatus('Настройки дерева сохранены.');
    } catch (e) {
      setStatus(formatApiError(e));
    }
  }

  if (!settings) return null;

  return (
    <Card>
      <h3 className="text-lg font-semibold">Приватность дерева</h3>
      <p className="mt-1 text-sm text-stone-600">Семья: {familyId}</p>
      <div className="mt-4 space-y-3">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={settings.hideLivingPersons}
            onChange={(e) => setSettings({ ...settings, hideLivingPersons: e.target.checked })}
          />
          Скрывать живых людей на публичных страницах
        </label>
        <label className="block text-sm">
          Уровень видимости дерева
          <Select
            className="mt-1"
            value={settings.treePrivacyLevel}
            onChange={(e) => setSettings({ ...settings, treePrivacyLevel: e.target.value })}
          >
            <option value="PRIVATE">PRIVATE</option>
            <option value="FAMILY">FAMILY</option>
            <option value="PUBLIC">PUBLIC</option>
          </Select>
        </label>
        <Button type="button" onClick={() => void save()}>
          Сохранить
        </Button>
      </div>
      {status ? <p className="mt-3 text-sm">{status}</p> : null}
    </Card>
  );
}
