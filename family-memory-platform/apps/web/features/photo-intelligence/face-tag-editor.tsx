'use client';

import { useTranslations } from 'next-intl';
import type { PersonSummary } from '@family/shared';
import { Button } from '@/components/ui';

interface FaceTagEditorProps {
  persons: PersonSummary[];
  selectedPersonId?: string;
  label: string;
  note: string;
  onPersonChange: (personId: string) => void;
  onLabelChange: (value: string) => void;
  onNoteChange: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
}

export function FaceTagEditor({
  persons,
  selectedPersonId,
  label,
  note,
  onPersonChange,
  onLabelChange,
  onNoteChange,
  onSave,
  onCancel,
}: FaceTagEditorProps) {
  const t = useTranslations('photoIntelligence');

  return (
    <div className="space-y-3 rounded-2xl border bg-white/90 p-4 dark:bg-slate-950/90">
      <label className="block text-sm">
        <span className="text-stone-500">{t('selectPerson')}</span>
        <select
          className="mt-1 w-full rounded-xl border bg-transparent px-3 py-2"
          value={selectedPersonId ?? ''}
          onChange={(e) => onPersonChange(e.target.value)}
        >
          <option value="">{t('selectPersonPlaceholder')}</option>
          {persons.map((p) => (
            <option key={p.id} value={p.id}>
              {[p.givenName, p.patronymic, p.familyName].filter(Boolean).join(' ')}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm">
        <span className="text-stone-500">{t('faceLabel')}</span>
        <input
          className="mt-1 w-full rounded-xl border bg-transparent px-3 py-2"
          value={label}
          onChange={(e) => onLabelChange(e.target.value)}
        />
      </label>
      <label className="block text-sm">
        <span className="text-stone-500">{t('faceNote')}</span>
        <textarea
          className="mt-1 w-full rounded-xl border bg-transparent px-3 py-2"
          rows={2}
          value={note}
          onChange={(e) => onNoteChange(e.target.value)}
        />
      </label>
      <div className="flex gap-2">
        <Button onClick={onSave}>
          {t('saveTag')}
        </Button>
        <Button variant="ghost" onClick={onCancel}>
          {t('cancel')}
        </Button>
      </div>
    </div>
  );
}
