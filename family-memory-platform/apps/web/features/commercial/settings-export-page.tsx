'use client';

import { useState } from 'react';
import { PageHeader, Card, Button, Input } from '@/components/ui';
import { api, formatApiError } from '@/lib/api-client';
import { useWorkspaceCommercial } from './use-workspace-commercial';

export function SettingsExportPage() {
  const { token, workspaceId, error, loading } = useWorkspaceCommercial();
  const [familyId, setFamilyId] = useState('seed-family-petrov');
  const [status, setStatus] = useState<string | null>(null);
  const [gedcomPreview, setGedcomPreview] = useState<string | null>(null);

  async function downloadGdpr() {
    if (!token || !workspaceId) return;
    setStatus(null);
    try {
      const bundle = await api.commercial.exportGdpr(workspaceId, token);
      const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `workspace-${workspaceId}-gdpr.json`;
      a.click();
      URL.revokeObjectURL(url);
      setStatus('GDPR JSON скачан.');
    } catch (e) {
      setStatus(formatApiError(e));
    }
  }

  async function exportGedcom() {
    if (!token || !workspaceId) return;
    setStatus(null);
    try {
      const res = await api.commercial.exportGedcom(workspaceId, familyId, token);
      setGedcomPreview(res.gedcomText.slice(0, 1200));
      const blob = new Blob([res.gedcomText], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = res.fileName;
      a.click();
      URL.revokeObjectURL(url);
      setStatus('GEDCOM экспортирован (лимит тарифа учитывается).');
    } catch (e) {
      setStatus(formatApiError(e));
    }
  }

  if (loading) return <p className="text-sm text-stone-500">Загрузка…</p>;
  if (error) return <p className="text-sm text-red-600">{error}</p>;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Экспорт данных"
        description="GDPR bundle (JSON) и GEDCOM export с учётом лимитов подписки."
      />
      <Card>
        <h2 className="text-lg font-semibold">GDPR export</h2>
        <Button className="mt-4" type="button" onClick={() => void downloadGdpr()}>
          Скачать JSON bundle
        </Button>
      </Card>
      <Card>
        <h2 className="text-lg font-semibold">GEDCOM export</h2>
        <Input
          className="mt-4"
          value={familyId}
          onChange={(e) => setFamilyId(e.target.value)}
          placeholder="familyId"
        />
        <Button className="mt-4" type="button" onClick={() => void exportGedcom()}>
          Экспорт .ged
        </Button>
        {gedcomPreview ? (
          <pre className="mt-4 max-h-48 overflow-auto rounded bg-stone-100 p-3 text-xs dark:bg-slate-900">
            {gedcomPreview}
          </pre>
        ) : null}
      </Card>
      {status ? <p className="text-sm">{status}</p> : null}
    </div>
  );
}
