'use client';

import { useRef, useState, type RefObject } from 'react';
import { useTranslations } from 'next-intl';
import { Button, Select } from '@/components/ui';
import { type DocumentTypeOption, type PersonAttachmentDraft } from '@/lib/person-assets';

const DOCUMENT_TYPE_KEYS: DocumentTypeOption[] = [
  'PASSPORT',
  'BIRTH_CERTIFICATE',
  'DEATH_CERTIFICATE',
  'MARRIAGE_CERTIFICATE',
  'MILITARY_RECORD',
  'ARCHIVE_RECORD',
  'OTHER',
];
import { cn } from '@/lib/utils';

type Props = {
  draft: PersonAttachmentDraft;
  onChange: (next: PersonAttachmentDraft) => void;
  disabled?: boolean;
};

export function PersonAttachmentsForm({ draft, onChange, disabled }: Props) {
  const t = useTranslations('personAttachments');
  const tDoc = useTranslations('documentTypes');
  const avatarRef = useRef<HTMLInputElement>(null);
  const mediaRef = useRef<HTMLInputElement>(null);
  const docRef = useRef<HTMLInputElement>(null);

  function setAvatar(file: File | null) {
    if (draft.avatarPreview) {
      URL.revokeObjectURL(draft.avatarPreview);
    }
    onChange({
      ...draft,
      avatarFile: file,
      avatarPreview: file ? URL.createObjectURL(file) : null,
    });
  }

  function addMediaFiles(files: FileList | null) {
    if (!files?.length) return;
    onChange({ ...draft, mediaFiles: [...draft.mediaFiles, ...Array.from(files)] });
  }

  function addDocument(file: File, documentType: DocumentTypeOption) {
    onChange({
      ...draft,
      documents: [...draft.documents, { file, documentType, title: file.name.replace(/\.[^.]+$/, '') }],
    });
  }

  return (
    <div className="space-y-5 border-t border-stone-200 pt-5 dark:border-slate-800">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-stone-500 dark:text-slate-400">{t('title')}</h3>

      <section className="space-y-3">
        <p className="text-sm font-medium">{t('avatar')}</p>
        <div className="flex items-center gap-4">
          <div
            className={cn(
              'flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed bg-stone-50 dark:bg-slate-950',
              draft.avatarPreview && 'border-family-accent',
            )}
          >
            {draft.avatarPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={draft.avatarPreview} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="text-xs text-stone-400">{t('noPhoto')}</span>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <input
              ref={avatarRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              disabled={disabled}
              onChange={(e) => setAvatar(e.target.files?.[0] ?? null)}
            />
            <Button type="button" variant="secondary" disabled={disabled} onClick={() => avatarRef.current?.click()}>
              {t('pickAvatar')}
            </Button>
            {draft.avatarFile ? (
              <button
                type="button"
                className="text-left text-xs text-red-600 hover:underline dark:text-red-400"
                onClick={() => setAvatar(null)}
              >
                {t('remove')}
              </button>
            ) : null}
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <p className="text-sm font-medium">{t('mediaTitle')}</p>
        <p className="text-xs text-stone-500 dark:text-slate-400">{t('mediaHint')}</p>
        <input
          ref={mediaRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp,video/mp4,audio/mpeg"
          className="hidden"
          disabled={disabled}
          onChange={(e) => {
            addMediaFiles(e.target.files);
            e.target.value = '';
          }}
        />
        <Button type="button" variant="secondary" disabled={disabled} onClick={() => mediaRef.current?.click()}>
          {t('addFiles')}
        </Button>
        {draft.mediaFiles.length > 0 ? (
          <ul className="space-y-1 text-sm text-stone-600 dark:text-slate-300">
            {draft.mediaFiles.map((f, i) => (
              <li key={`${f.name}-${i}`} className="flex justify-between gap-2">
                <span className="truncate">{f.name}</span>
                <button
                  type="button"
                  className="shrink-0 text-xs text-red-600 dark:text-red-400"
                  onClick={() =>
                    onChange({ ...draft, mediaFiles: draft.mediaFiles.filter((_, idx) => idx !== i) })
                  }
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <section className="space-y-3">
        <p className="text-sm font-medium">{t('documentsTitle')}</p>
        <p className="text-xs text-stone-500 dark:text-slate-400">{t('documentsHint')}</p>
        <DocumentAddRow disabled={disabled} onPick={(file, type) => addDocument(file, type)} inputRef={docRef} />
        {draft.documents.length > 0 ? (
          <ul className="space-y-2 text-sm">
            {draft.documents.map((d, i) => (
              <li
                key={`${d.file.name}-${i}`}
                className="flex items-center justify-between gap-2 rounded-lg bg-stone-50 px-3 py-2 dark:bg-slate-900"
              >
                <span className="truncate">
                  {tDoc(d.documentType)} — {d.file.name}
                </span>
                <button
                  type="button"
                  className="text-xs text-red-600 dark:text-red-400"
                  onClick={() =>
                    onChange({ ...draft, documents: draft.documents.filter((_, idx) => idx !== i) })
                  }
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </section>
    </div>
  );
}

function DocumentAddRow({
  disabled,
  onPick,
  inputRef,
}: {
  disabled?: boolean;
  onPick: (file: File, type: DocumentTypeOption) => void;
  inputRef: RefObject<HTMLInputElement | null>;
}) {
  const t = useTranslations('personAttachments');
  const tDoc = useTranslations('documentTypes');
  const [documentType, setDocumentType] = useState<DocumentTypeOption>('PASSPORT');

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <Select
        className="sm:max-w-[220px]"
        value={documentType}
        disabled={disabled}
        onChange={(e) => {
          setDocumentType(e.target.value as DocumentTypeOption);
        }}
      >
        {DOCUMENT_TYPE_KEYS.map((key) => (
          <option key={key} value={key}>
            {tDoc(key)}
          </option>
        ))}
      </Select>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,application/pdf"
        className="hidden"
        disabled={disabled}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onPick(file, documentType);
          e.target.value = '';
        }}
      />
      <Button type="button" variant="secondary" disabled={disabled} onClick={() => inputRef.current?.click()}>
        {t('attachDocument')}
      </Button>
    </div>
  );
}
