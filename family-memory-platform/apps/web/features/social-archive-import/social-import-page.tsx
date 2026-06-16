'use client';

import { useState } from 'react';
import { Button, Card, PageHeader } from '@/components/ui';
import { useAuth } from '@/components/auth-provider';
import { apiClient } from '@/lib/api-client';

export function SocialImportPage() {
  const { session } = useAuth();
  const token = session?.accessToken ?? null;
  const [importId, setImportId] = useState<string | null>(null);
  const [items, setItems] = useState<Array<{ id: string; title?: string | null; selected: boolean }>>([]);
  const [result, setResult] = useState('');

  async function createDemoImport() {
    if (!token) return;
    const created = (await apiClient.socialArchiveImport.create(
      {
        fileName: 'demo-instagram.json',
        provider: 'INSTAGRAM',
        manifestItems: [
          { externalId: 'post-1', title: 'Family picnic 1998', caption: 'With grandmother', takenAt: '1998-07-01' },
          { externalId: 'post-2', title: 'Wedding photo', caption: 'Archive import demo' },
        ],
      },
      token,
    )) as { id: string };
    setImportId(created.id);
    const preview = (await apiClient.socialArchiveImport.items(created.id, token)) as {
      items: Array<{ id: string; title?: string | null; selected: boolean }>;
    };
    setItems(preview.items);
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Social Archive Import" description="Parse → preview → confirm (no auto-import)." />
      <Button type="button" disabled={!token} onClick={() => void createDemoImport()}>
        Load demo manifest
      </Button>
      {items.length ? (
        <Card className="space-y-2">
          {items.map((i) => (
            <p key={i.id} className="text-sm">{i.title ?? i.id}</p>
          ))}
          <Button
            type="button"
            disabled={!token || !importId}
            onClick={async () => {
              if (!token || !importId) return;
              await apiClient.socialArchiveImport.select(importId, { all: true, selected: true }, token);
              const r = (await apiClient.socialArchiveImport.confirm(importId, {}, token)) as {
                importedCount: number;
              };
              setResult(`Imported ${r.importedCount} media items (PRIVATE by default).`);
            }}
          >
            Confirm import
          </Button>
        </Card>
      ) : null}
      {result ? <p className="text-sm text-green-700">{result}</p> : null}
    </div>
  );
}
