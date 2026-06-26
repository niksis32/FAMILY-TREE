'use client';

import { useCallback, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { AlertCircle, Camera, RotateCcw, Upload } from 'lucide-react';
import { useAuth } from '@/components/auth-provider';
import { MediaPreview } from '@/components/media-preview';
import { ProgressBar } from '@family/ui';
import { Button, Card, Input } from '@/components/ui';
import { apiClient } from '@/lib/api-client';
import { uploadMediaAsset, withRetry } from '@/lib/storage-upload';
import { cn } from '@/lib/utils';

const allowedMimeTypes = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
  'video/mp4',
  'audio/mpeg',
];

type UploadState = 'idle' | 'uploading' | 'success' | 'error';

export function MediaUploader({ onUploaded }: { onUploaded?: () => void }) {
  const { session } = useAuth();
  const t = useTranslations('mediaUploader');
  const inputRef = useRef<HTMLInputElement | null>(null);
  const cameraRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<UploadState>('idle');
  const [message, setMessage] = useState('');
  const [personId, setPersonId] = useState('');
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [lastMediaId, setLastMediaId] = useState<string | null>(null);

  const runUpload = useCallback(
    async (file: File) => {
      if (!allowedMimeTypes.includes(file.type)) {
        setStatus('error');
        setMessage(t('unsupportedMime', { type: file.type }));
        return;
      }

      if (!session?.accessToken) {
        setStatus('error');
        setMessage(t('authRequired'));
        return;
      }

      setPendingFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setProgress(0);
      setStatus('uploading');
      setMessage(t('gettingUrl'));

      try {
        const created = await withRetry(
          () =>
            uploadMediaAsset(file, session.accessToken, {
              personId: personId || undefined,
              onProgress: (pct, phase) => {
                const mapped =
                  phase === 'presigned' ? 15 : phase === 'metadata' ? 85 : Math.min(80, 20 + Math.round(pct * 0.6));
                setProgress(mapped);
                if (phase === 'uploading') setMessage(t('uploadingMinio'));
                if (phase === 'metadata') setMessage(t('savingMetadata'));
              },
            }),
          3,
        );

        setLastMediaId(created.id);
        setProgress(100);
        setStatus('success');
        setMessage(t('success'));
        onUploaded?.();
      } catch (error) {
        setStatus('error');
        setMessage(error instanceof Error ? error.message : t('uploadFailed'));
        setProgress(0);
      }
    },
    [session?.accessToken, personId, t, onUploaded],
  );

  async function handleFiles(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    await runUpload(file);
  }

  async function openPreview() {
    if (!lastMediaId || !session?.accessToken) return;
    const dl = await apiClient.media.downloadUrl(lastMediaId, session.accessToken);
    window.open(dl.downloadUrl, '_blank', 'noopener,noreferrer');
  }

  return (
    <Card className="border-dashed">
      <div
        className={cn(
          'rounded-2xl border border-dashed bg-stone-50 p-8 text-center transition dark:bg-slate-950',
          isDragging && 'border-family-accent bg-family-accent/10',
          status === 'error' && 'border-red-300 dark:border-red-800',
        )}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);
          void handleFiles(event.dataTransfer.files);
        }}
      >
        <Upload className="mx-auto h-8 w-8 text-family-accent" />
        <p className="mt-3 text-lg font-semibold">{t('title')}</p>
        <p className="mt-2 text-sm text-stone-500 dark:text-slate-400">{t('hint')}</p>

        <div className="mx-auto mt-5 max-w-xl">
          <Input
            placeholder={t('personIdPlaceholder')}
            value={personId}
            onChange={(event) => setPersonId(event.target.value)}
          />
        </div>

        <input
          ref={inputRef}
          className="hidden"
          type="file"
          accept={allowedMimeTypes.join(',')}
          onChange={(event) => void handleFiles(event.target.files)}
        />
        <input
          ref={cameraRef}
          className="hidden"
          type="file"
          accept="image/*"
          capture="environment"
          onChange={(event) => void handleFiles(event.target.files)}
        />

        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <Button type="button" onClick={() => inputRef.current?.click()} disabled={status === 'uploading'}>
            {t('chooseFile')}
          </Button>
          <Button type="button" variant="secondary" onClick={() => cameraRef.current?.click()} disabled={status === 'uploading'}>
            <Camera className="mr-2 h-4 w-4" />
            {t('takePhoto')}
          </Button>
          {status === 'error' && pendingFile ? (
            <Button type="button" variant="secondary" onClick={() => void runUpload(pendingFile)}>
              <RotateCcw className="mr-2 h-4 w-4" />
              {t('retry')}
            </Button>
          ) : null}
          {status === 'success' && lastMediaId ? (
            <Button type="button" variant="ghost" onClick={() => void openPreview()}>
              {t('openFile')}
            </Button>
          ) : null}
        </div>

        {previewUrl && pendingFile ? (
          <div className="mx-auto mt-6 max-w-md overflow-hidden rounded-xl border aspect-[4/3]">
            <MediaPreview mimeType={pendingFile.type} downloadUrl={previewUrl} title={pendingFile.name} />
          </div>
        ) : null}

        <ProgressBar value={progress} size="lg" className="mx-auto mt-6 max-w-md bg-white dark:bg-slate-900" />

        <p
          className={cn(
            'mt-3 flex items-center justify-center gap-2 text-sm',
            status === 'error' ? 'text-red-600 dark:text-red-400' : 'text-stone-600 dark:text-slate-300',
          )}
        >
          {status === 'error' ? <AlertCircle className="h-4 w-4 shrink-0" /> : null}
          {message || t('idle')}
        </p>
      </div>
    </Card>
  );
}
