'use client';

import { useRef, useState } from 'react';
import { useAuth } from '@/components/auth-provider';
import { Button, Card } from '@/components/ui';
import { apiClient, type GedcomPreview } from '@/lib/api-client';

export function GedcomImportPanel() {
  const { session } = useAuth();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [fileName, setFileName] = useState<string>();
  const [gedcomText, setGedcomText] = useState('');
  const [preview, setPreview] = useState<GedcomPreview | null>(null);
  const [status, setStatus] = useState('Выберите .ged файл для preview');

  async function readFile(file: File) {
    if (!file.name.toLowerCase().endsWith('.ged')) {
      setStatus('Нужен файл .ged');
      return;
    }

    const text = await file.text();
    setFileName(file.name);
    setGedcomText(text);
    setStatus('Строим preview...');
    const data = await apiClient.gedcom.preview(text, file.name, session?.accessToken);
    setPreview(data);
    setStatus('Preview готов');
  }

  async function confirmImport() {
    if (!gedcomText) return;
    setStatus('Импортируем GEDCOM...');
    const data = await apiClient.gedcom.import(gedcomText, fileName, session?.accessToken);
    setPreview(data);
    setStatus('Импорт завершён');
  }

  return (
    <div className="space-y-6">
      <Card className="border-dashed">
        <div className="rounded-2xl bg-stone-50 p-8 text-center dark:bg-slate-950">
          <p className="text-lg font-semibold">Upload GEDCOM</p>
          <p className="mt-2 text-sm text-stone-500 dark:text-slate-400">
            MVP читает файл в браузере и отправляет текст на `/gedcom/preview`, затем подтверждает импорт.
          </p>
          <input
            ref={inputRef}
            className="hidden"
            type="file"
            accept=".ged"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void readFile(file);
            }}
          />
          <Button className="mt-5" type="button" onClick={() => inputRef.current?.click()}>
            Выбрать .ged
          </Button>
        </div>
      </Card>

      <Card>
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h2 className="text-xl font-semibold">Import report</h2>
            <p className="mt-2 text-sm text-stone-500 dark:text-slate-400">{status}</p>
          </div>
          <Button type="button" disabled={!preview || preview.errors.length > 0} onClick={() => void confirmImport()}>
            Confirm import
          </Button>
        </div>

        {preview ? (
          <div className="mt-6 grid gap-3 md:grid-cols-5">
            <Metric label="Персоны" value={preview.personsFound} />
            <Metric label="Семьи" value={preview.familiesFound} />
            <Metric label="Связи" value={preview.relationshipsFound} />
            <Metric label="События" value={preview.eventsFound} />
            <Metric label="Источники" value={preview.sourcesFound} />
          </div>
        ) : null}

        {preview?.errors.length ? (
          <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:bg-rose-950 dark:text-rose-200">
            {preview.errors.join('\n')}
          </div>
        ) : null}

        {preview?.warnings.length ? (
          <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-200">
            {preview.warnings.slice(0, 8).join('\n')}
          </div>
        ) : null}
      </Card>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border bg-stone-50 p-4 dark:bg-slate-950">
      <p className="text-xs text-stone-500 dark:text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-family-primary dark:text-family-accent">{value}</p>
    </div>
  );
}
