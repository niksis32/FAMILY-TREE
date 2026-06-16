'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui';

interface OcrTextEditorProps {
  initialValue: string;
  readOnly?: boolean;
  onSave: (text: string) => Promise<void>;
}

export function OcrTextEditor({ initialValue, readOnly, onSave }: OcrTextEditorProps) {
  const t = useTranslations('documentIntelligence');
  const [value, setValue] = useState(initialValue);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  if (readOnly) {
    return (
      <pre className="whitespace-pre-wrap rounded-2xl border bg-stone-50 p-4 text-sm dark:bg-slate-950">{value || '—'}</pre>
    );
  }

  return (
    <div className="space-y-3">
      <textarea
        className="min-h-[240px] w-full rounded-2xl border bg-white p-4 text-sm dark:bg-slate-950"
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setDirty(true);
        }}
      />
      <Button
        type="button"
        disabled={!dirty || saving}
        onClick={async () => {
          setSaving(true);
          try {
            await onSave(value);
            setDirty(false);
          } finally {
            setSaving(false);
          }
        }}
      >
        {saving ? t('ocrSaving') : t('ocrSave')}
      </Button>
    </div>
  );
}
