'use client';

import { useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { FileUp, RotateCcw } from 'lucide-react';
import { useAuth } from '@/components/auth-provider';
import { ProgressBar } from '@family/ui';
import { Button, Input } from '@/components/ui';
import { uploadDocumentAsset, withRetry } from '@/lib/storage-upload';
import { cn } from '@/lib/utils';

const allowedMimeTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];

export function DocumentFileUploader({
  onUploaded,
  defaultPersonId = '',
}: {
  onUploaded?: () => void;
  defaultPersonId?: string;
}) {
  const { session } = useAuth();
  const t = useTranslations('documentUploader');
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [title, setTitle] = useState('');
  const [personId, setPersonId] = useState(defaultPersonId);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  async function upload(file: File) {
    if (!session?.accessToken) {
      setStatus('error');
      setMessage(t('authRequired'));
      return;
    }
    if (!allowedMimeTypes.includes(file.type)) {
      setStatus('error');
      setMessage(t('unsupportedMime', { type: file.type }));
      return;
    }

    setPendingFile(file);
    setStatus('uploading');
    setMessage(t('uploading'));
    setProgress(0);

    try {
      await withRetry(
        () =>
          uploadDocumentAsset(
            file,
            session.accessToken,
            {
              title: title.trim() || file.name,
              documentType: 'OTHER',
              personId: personId.trim() || undefined,
            },
            (pct, phase) => {
              const mapped = phase === 'presigned' ? 12 : phase === 'metadata' ? 88 : 20 + Math.round(pct * 0.55);
              setProgress(mapped);
            },
          ),
        3,
      );
      setProgress(100);
      setStatus('success');
      setMessage(t('success'));
      setTitle('');
      onUploaded?.();
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : t('failed'));
      setProgress(0);
    }
  }

  return (
    <div
      className={cn(
        'rounded-2xl border border-dashed p-6',
        status === 'error' && 'border-red-300 dark:border-red-800',
      )}
    >
      <div className="flex items-center gap-2 text-family-primary dark:text-family-accent">
        <FileUp className="h-5 w-5" />
        <p className="font-semibold">{t('title')}</p>
      </div>
      <p className="mt-2 text-sm text-stone-500">{t('hint')}</p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Input placeholder={t('titlePlaceholder')} value={title} onChange={(e) => setTitle(e.target.value)} />
        <Input placeholder={t('personIdPlaceholder')} value={personId} onChange={(e) => setPersonId(e.target.value)} />
      </div>

      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept={allowedMimeTypes.join(',')}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void upload(file);
        }}
      />

      <div className="mt-4 flex flex-wrap gap-2">
        <Button type="button" disabled={status === 'uploading'} onClick={() => inputRef.current?.click()}>
          {t('chooseFile')}
        </Button>
        {status === 'error' && pendingFile ? (
          <Button type="button" variant="secondary" onClick={() => void upload(pendingFile)}>
            <RotateCcw className="mr-2 h-4 w-4" />
            {t('retry')}
          </Button>
        ) : null}
      </div>

      <ProgressBar value={progress} className="mt-4" />
      {message ? <p className="mt-2 text-sm text-stone-600 dark:text-slate-300">{message}</p> : null}
    </div>
  );
}
