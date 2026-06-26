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
  const [fileName, setFileName] = useState('instagram-export.zip');
  const [provider, setProvider] = useState<'INSTAGRAM' | 'FACEBOOK'>('INSTAGRAM');

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

  async function createZipImportJob() {
    if (!token) return;
    const upload = (await apiClient.socialArchiveImport.uploadUrl(fileName, token)) as {
      storageKey: string;
    };
    const created = (await apiClient.socialArchiveImport.create(
      {
        fileName,
        provider,
        stagingKey: upload.storageKey,
        sizeBytes: 0,
      },
      token,
    )) as { id: string; status: string };
    setImportId(created.id);
    setResult(
      `Import job ${created.id} created (${created.status}). Upload ZIP to presigned URL, then refresh preview when PARSING completes.`,
    );
  }

  async function refreshPreview() {
    if (!token || !importId) return;
    const preview = (await apiClient.socialArchiveImport.items(importId, token)) as {
      items: Array<{ id: string; title?: string | null; selected: boolean }>;
    };
    setItems(preview.items);
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Social Archive Import" description="ZIP/JSON parse → preview → confirm (no auto-import)." />
      <Card className="space-y-3">
        <p className="text-sm text-stone-600">Server-side parser supports Instagram/Facebook JSON inside ZIP exports.</p>
        <div className="flex flex-wrap gap-2">
          <input className="rounded border px-2 py-1 text-sm" value={fileName} onChange={(e) => setFileName(e.target.value)} />
          <select className="rounded border px-2 py-1 text-sm" value={provider} onChange={(e) => setProvider(e.target.value as 'INSTAGRAM' | 'FACEBOOK')}>
            <option value="INSTAGRAM">Instagram</option>
            <option value="FACEBOOK">Facebook</option>
          </select>
          <Button type="button" disabled={!token} onClick={() => void createZipImportJob()}>
            Create ZIP import job
          </Button>
          <Button type="button" variant="secondary" disabled={!token || !importId} onClick={() => void refreshPreview()}>
            Refresh preview
          </Button>
        </div>
      </Card>
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
