'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/components/auth-provider';
import { Button, Select } from '@/components/ui';
import { PageHero } from '@family/ui';
import { apiClient, formatApiError } from '@/lib/api-client';

type FamilyRecord = { id: string; name: string };

export function ExportWizardPage() {
  const { session, isReady } = useAuth();
  const t = useTranslations('block5.export');
  const [templates, setTemplates] = useState<Array<{ code: string; label?: string }>>([]);
  const [families, setFamilies] = useState<FamilyRecord[]>([]);
  const [template, setTemplate] = useState('FAMILY_BOOK_STANDARD');
  const [familyId, setFamilyId] = useState('');
  const [previewHtml, setPreviewHtml] = useState('');
  const [jobStatus, setJobStatus] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!session?.accessToken) return;
    try {
      const [rows, familyRows] = await Promise.all([
        apiClient.pdfExport.templates(session.accessToken) as Promise<Array<{ code: string; label?: string }>>,
        apiClient.families.list(session.accessToken) as Promise<FamilyRecord[]>,
      ]);
      setTemplates(rows);
      setFamilies(familyRows);
      if (rows[0]?.code) setTemplate(rows[0].code);
    } catch (err) {
      setError(formatApiError(err));
    }
  }, [session?.accessToken]);

  useEffect(() => {
    if (!isReady) return;
    void load();
  }, [isReady, load]);

  function exportBody() {
    return {
      templateCode: template,
      ...(familyId ? { familyId } : {}),
    };
  }

  async function runPreview() {
    if (!session?.accessToken) return;
    setError('');
    try {
      const res = await apiClient.pdfExport.preview(exportBody(), session.accessToken);
      setPreviewHtml(res.html);
    } catch (err) {
      setError(formatApiError(err));
    }
  }

  async function runExport() {
    if (!session?.accessToken) return;
    setError('');
    setJobStatus('QUEUED');
    try {
      const job = await apiClient.pdfExport.createJob(exportBody(), session.accessToken) as { id: string };
      for (let i = 0; i < 30; i++) {
        await new Promise((r) => setTimeout(r, 2000));
        const status = await apiClient.pdfExport.getJob(job.id, session.accessToken) as { status?: string; downloadUrl?: string };
        setJobStatus(status.status ?? '');
        if (status.status === 'COMPLETED') {
          if (status.downloadUrl) window.open(status.downloadUrl, '_blank');
          break;
        }
        if (status.status === 'FAILED') break;
      }
    } catch (err) {
      setError(formatApiError(err));
    }
  }

  return (
    <div className="space-y-6">
      <PageHero eyebrow={t('eyebrow')} title={t('title')} description={t('description')} />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Select value={template} onChange={(e) => setTemplate(e.target.value)}>
        {templates.map((tpl) => (
          <option key={tpl.code} value={tpl.code}>{tpl.label ?? tpl.code}</option>
        ))}
      </Select>
      <div>
        <label className="mb-1 block text-sm font-medium">{t('familyBranch')}</label>
        <Select value={familyId} onChange={(e) => setFamilyId(e.target.value)}>
          <option value="">{t('allWorkspace')}</option>
          {families.map((f) => (
            <option key={f.id} value={f.id}>{f.name}</option>
          ))}
        </Select>
      </div>
      <div className="flex gap-3">
        <Button variant="secondary" onClick={() => void runPreview()}>{t('preview')}</Button>
        <Button onClick={() => void runExport()}>{t('export')}</Button>
      </div>
      {jobStatus && <p className="text-sm">{t('jobStatus')}: {jobStatus}</p>}
      {previewHtml && (
        <iframe title="export-preview" className="h-[480px] w-full rounded border bg-white" srcDoc={previewHtml} />
      )}
    </div>
  );
}
