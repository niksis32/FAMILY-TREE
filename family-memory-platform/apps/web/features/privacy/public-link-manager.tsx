'use client';

import { useState } from 'react';
import type { PublicShareSummary } from '@family/shared';
import { Button, Card, Input } from '@/components/ui';
import { api, formatApiError } from '@/lib/api-client';

export function PublicLinkManager({
  shares,
  token,
  onRefresh,
}: {
  shares: PublicShareSummary[];
  token: string;
  onRefresh: () => void;
}) {
  const [resourceType, setResourceType] = useState('FAMILY_TREE');
  const [resourceId, setResourceId] = useState('');
  const [label, setLabel] = useState('');
  const [lastToken, setLastToken] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  async function create() {
    if (!resourceId.trim()) return;
    try {
      const result = await api.privacy.createPublicShare(
        {
          resourceType,
          resourceId: resourceId.trim(),
          label: label.trim() || undefined,
          hideLivingPersons: true,
        },
        token,
      );
      setLastToken(result.publicToken);
      setStatus('Ссылка создана. Скопируйте токен — он показывается один раз.');
      onRefresh();
    } catch (e) {
      setStatus(formatApiError(e));
    }
  }

  async function revoke(id: string) {
    try {
      await api.privacy.revokePublicShare(id, token);
      onRefresh();
      setStatus('Ссылка отозвана.');
    } catch (e) {
      setStatus(formatApiError(e));
    }
  }

  return (
    <Card>
      <h3 className="text-lg font-semibold">Публичные ссылки</h3>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="text-sm">
          Тип
          <select
            className="mt-1 w-full rounded border px-2 py-2"
            value={resourceType}
            onChange={(e) => setResourceType(e.target.value)}
          >
            <option value="FAMILY_TREE">Дерево (familyId)</option>
            <option value="PERSON">Персона</option>
            <option value="FAMILY_STORY">Family Story</option>
            <option value="MEDIA_BUNDLE">Медиа-пакет</option>
          </select>
        </label>
        <label className="text-sm">
          Resource ID
          <Input className="mt-1" value={resourceId} onChange={(e) => setResourceId(e.target.value)} />
        </label>
        <label className="text-sm sm:col-span-2">
          Метка
          <Input className="mt-1" value={label} onChange={(e) => setLabel(e.target.value)} />
        </label>
      </div>
      <Button className="mt-4" type="button" onClick={() => void create()}>
        Создать ссылку
      </Button>
      {lastToken ? (
        <p className="mt-3 break-all rounded bg-stone-100 p-2 text-xs dark:bg-slate-800">
          Token: {lastToken}
        </p>
      ) : null}
      <ul className="mt-6 space-y-2 text-sm">
        {shares.map((s) => (
          <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 border-b py-2">
            <span>
              {s.label ?? s.resourceType} — {s.resourceId} — просмотров: {s.viewCount}
            </span>
            <Button type="button" onClick={() => void revoke(s.id)}>
              Отозвать
            </Button>
          </li>
        ))}
      </ul>
      {status ? <p className="mt-3 text-sm">{status}</p> : null}
    </Card>
  );
}
