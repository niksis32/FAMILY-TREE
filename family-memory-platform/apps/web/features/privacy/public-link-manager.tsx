'use client';

import { useMemo, useState } from 'react';
import type { PublicShareStatus, PublicShareSummary } from '@family/shared';
import { Button, Card, Input } from '@/components/ui';
import { api, formatApiError } from '@/lib/api-client';

const EXPIRY_PRESETS = [
  { id: '7d', label: '7 дней', days: 7 },
  { id: '30d', label: '30 дней', days: 30 },
  { id: '90d', label: '90 дней (по умолчанию)', days: 90 },
  { id: 'never', label: 'Без срока', days: null },
] as const;

function statusLabel(status: PublicShareStatus): string {
  switch (status) {
    case 'active':
      return 'Активна';
    case 'expired':
      return 'Истекла';
    case 'revoked':
      return 'Отозвана';
  }
}

function statusClass(status: PublicShareStatus): string {
  switch (status) {
    case 'active':
      return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200';
    case 'expired':
      return 'bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200';
    case 'revoked':
      return 'bg-stone-200 text-stone-700 dark:bg-slate-700 dark:text-slate-300';
  }
}

function formatExpiry(expiresAt: string | null): string {
  if (!expiresAt) return 'Без срока';
  return new Date(expiresAt).toLocaleString('ru-RU', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

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
  const [expiryPreset, setExpiryPreset] = useState<(typeof EXPIRY_PRESETS)[number]['id']>('90d');
  const [lastToken, setLastToken] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const sortedShares = useMemo(
    () =>
      [...shares].sort((a, b) => {
        const order: Record<PublicShareStatus, number> = { active: 0, expired: 1, revoked: 2 };
        return order[a.status] - order[b.status] || b.createdAt.localeCompare(a.createdAt);
      }),
    [shares],
  );

  function buildExpiryBody(): { expiresAt?: string; neverExpires?: boolean } {
    const preset = EXPIRY_PRESETS.find((p) => p.id === expiryPreset);
    if (!preset || preset.days === null) return { neverExpires: true };
    const date = new Date();
    date.setUTCDate(date.getUTCDate() + preset.days);
    return { expiresAt: date.toISOString() };
  }

  async function create() {
    if (!resourceId.trim()) return;
    try {
      const result = await api.privacy.createPublicShare(
        {
          resourceType,
          resourceId: resourceId.trim(),
          label: label.trim() || undefined,
          hideLivingPersons: true,
          ...buildExpiryBody(),
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
      <p className="mt-1 text-sm text-stone-600 dark:text-slate-400">
        Ссылки с истечением срока и отзывом. По умолчанию — 90 дней.
      </p>
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
        <label className="text-sm sm:col-span-2">
          Срок действия
          <select
            className="mt-1 w-full rounded border px-2 py-2"
            value={expiryPreset}
            onChange={(e) => setExpiryPreset(e.target.value as (typeof EXPIRY_PRESETS)[number]['id'])}
          >
            {EXPIRY_PRESETS.map((preset) => (
              <option key={preset.id} value={preset.id}>
                {preset.label}
              </option>
            ))}
          </select>
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
        {sortedShares.length === 0 ? (
          <li className="text-stone-500">Нет публичных ссылок</li>
        ) : (
          sortedShares.map((s) => (
            <li
              key={s.id}
              className="flex flex-wrap items-center justify-between gap-2 border-b py-2"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{s.label ?? s.resourceType}</span>
                  <span className={`rounded px-2 py-0.5 text-xs ${statusClass(s.status)}`}>
                    {statusLabel(s.status)}
                  </span>
                </div>
                <p className="mt-0.5 truncate text-stone-600 dark:text-slate-400">
                  {s.resourceId} · просмотров: {s.viewCount}
                </p>
                <p className="text-xs text-stone-500">Действует до: {formatExpiry(s.expiresAt)}</p>
              </div>
              {s.status === 'active' ? (
                <Button type="button" onClick={() => void revoke(s.id)}>
                  Отозвать
                </Button>
              ) : null}
            </li>
          ))
        )}
      </ul>
      {status ? <p className="mt-3 text-sm">{status}</p> : null}
    </Card>
  );
}
