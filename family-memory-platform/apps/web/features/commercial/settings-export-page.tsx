'use client';

import { useCallback, useEffect, useState } from 'react';
import { PageHeader, Card, Button, Input } from '@/components/ui';
import { api, formatApiError } from '@/lib/api-client';
import { useWorkspaceCommercial } from './use-workspace-commercial';
import type { WorkspaceExportJobSummary } from '@family/shared';

export function SettingsExportPage() {
  const { token, workspaceId, error, loading } = useWorkspaceCommercial();
  const [familyId, setFamilyId] = useState('seed-family-petrov');
  const [status, setStatus] = useState<string | null>(null);
  const [gedcomPreview, setGedcomPreview] = useState<string | null>(null);
  const [exportJobs, setExportJobs] = useState<WorkspaceExportJobSummary[]>([]);
  const [exportPolling, setExportPolling] = useState(false);

  const reloadJobs = useCallback(async () => {
    if (!token || !workspaceId) return;
    const jobs = await api.workspaceExport.list(workspaceId, token);
    setExportJobs(jobs);
    return jobs;
  }, [token, workspaceId]);

  useEffect(() => {
    void reloadJobs().catch(() => undefined);
  }, [reloadJobs]);

  useEffect(() => {
    if (!exportPolling || !token || !workspaceId) return;
    const timer = setInterval(() => {
      void reloadJobs();
    }, 3000);
    return () => clearInterval(timer);
  }, [exportPolling, reloadJobs, token, workspaceId]);

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

  async function requestWorkspaceExport() {
    if (!token || !workspaceId) return;
    setStatus('Ставим задачу экспорта workspace…');
    setExportPolling(true);
    try {
      await api.workspaceExport.request(workspaceId, token);
      await reloadJobs();
      setStatus('Экспорт поставлен в очередь. ZIP включает JSON, GEDCOM и media/.');
    } catch (e) {
      setStatus(formatApiError(e));
      setExportPolling(false);
    }
  }

  useEffect(() => {
    const active = exportJobs.some((j) => j.status === 'QUEUED' || j.status === 'PROCESSING');
    if (!active) setExportPolling(false);
  }, [exportJobs]);

  if (loading) return <p className="text-sm text-stone-500">Загрузка…</p>;
  if (error) return <p className="text-sm text-red-600">{error}</p>;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Экспорт данных"
        description="GDPR bundle, GEDCOM и полный ZIP workspace (JSON + media binaries)."
      />

      <Card>
        <h2 className="text-lg font-semibold">Workspace export (ZIP)</h2>
        <p className="mt-2 text-sm text-stone-500">
          Асинхронный архив: manifest.json, gdpr-bundle.json, gedcom/, media/, documents/.
        </p>
        <Button className="mt-4" type="button" onClick={() => void requestWorkspaceExport()}>
          Запросить экспорт workspace
        </Button>
        {exportJobs.length > 0 ? (
          <ul className="mt-4 space-y-2 text-sm">
            {exportJobs.map((job) => (
              <li key={job.id} className="rounded border px-3 py-2 dark:border-slate-800">
                <span className="font-medium">{job.status}</span>
                <span className="ml-2 text-stone-500">{new Date(job.createdAt).toLocaleString('ru-RU')}</span>
                {job.status === 'COMPLETED' && job.downloadUrl ? (
                  <a
                    href={job.downloadUrl}
                    className="ml-3 font-semibold text-family-primary underline dark:text-family-accent"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Скачать ZIP
                  </a>
                ) : null}
                {job.error ? <p className="mt-1 text-red-600">{job.error}</p> : null}
              </li>
            ))}
          </ul>
        ) : null}
      </Card>

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
