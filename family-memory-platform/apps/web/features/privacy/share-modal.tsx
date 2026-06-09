'use client';

import { useState } from 'react';
import type { PublicShareResourceType } from '@family/shared';
import { Button, Card, Input } from '@/components/ui';
import { api, formatApiError } from '@/lib/api-client';

export function ShareModal({
  open,
  onClose,
  token,
  resourceType,
  resourceId,
  workspaceId,
  label: defaultLabel,
}: {
  open: boolean;
  onClose: () => void;
  token: string;
  resourceType: PublicShareResourceType;
  resourceId: string;
  workspaceId?: string;
  label?: string;
}) {
  const [label, setLabel] = useState(defaultLabel ?? '');
  const [hideLiving, setHideLiving] = useState(true);
  const [status, setStatus] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);

  if (!open) return null;

  async function createShare() {
    setStatus('Создаём ссылку...');
    try {
      const result = await api.privacy.createPublicShare(
        {
          resourceType,
          resourceId,
          label: label || undefined,
          hideLivingPersons: hideLiving,
          workspaceId,
        },
        token,
      );
      const url = `${window.location.origin}${result.publicUrl ?? `/public/share/${result.publicToken}`}`;
      setShareUrl(url);
      setStatus('Ссылка создана');
    } catch (error) {
      setStatus(formatApiError(error));
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <Card className="w-full max-w-md">
        <h2 className="text-lg font-semibold">Поделиться</h2>
        <p className="mt-1 text-sm text-stone-500">Гостевая ссылка с TTL и журналом доступа.</p>

        <div className="mt-4 space-y-3">
          <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Метка ссылки" />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={hideLiving} onChange={(e) => setHideLiving(e.target.checked)} />
            Скрывать living persons
          </label>
        </div>

        {shareUrl ? (
          <p className="mt-4 break-all rounded-lg bg-stone-100 p-3 text-sm dark:bg-slate-800">{shareUrl}</p>
        ) : null}
        {status ? <p className="mt-3 text-sm text-stone-600 dark:text-slate-300">{status}</p> : null}

        <div className="mt-6 flex gap-2">
          <Button onClick={() => void createShare()}>Создать ссылку</Button>
          <Button variant="secondary" onClick={onClose}>
            Закрыть
          </Button>
        </div>
      </Card>
    </div>
  );
}
