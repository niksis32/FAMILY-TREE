'use client';

import { useRef, useState } from 'react';
import { useAuth } from '@/components/auth-provider';
import { Button, Card, Input, Select } from '@/components/ui';
import { apiClient } from '@/lib/api-client';
import { cn } from '@/lib/utils';

const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'video/mp4', 'audio/mpeg'];

export function MediaUploader() {
  const { session } = useAuth();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('Готово к загрузке');
  const [personId, setPersonId] = useState('');

  async function upload(file: File) {
    if (!allowedMimeTypes.includes(file.type)) {
      setStatus(`Неподдерживаемый MIME type: ${file.type}`);
      return;
    }

    setProgress(10);
    setStatus('Получаем presigned URL...');

    const presigned = await apiClient.media.uploadUrl(
      { fileName: file.name, mimeType: file.type, sizeBytes: file.size },
      session?.accessToken,
    );

    setProgress(35);
    setStatus('Загружаем файл в MinIO...');

    await fetch(presigned.uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': file.type },
      body: file,
    });

    setProgress(80);
    setStatus('Сохраняем metadata в PostgreSQL...');

    await apiClient.media.metadata(
      {
        fileName: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
        storageKey: presigned.storageKey,
        title: file.name,
        personId: personId || undefined,
      },
      session?.accessToken,
    );

    setProgress(100);
    setStatus('Файл загружен и сохранён');
  }

  async function handleFiles(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;

    try {
      await upload(file);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Ошибка загрузки');
      setProgress(0);
    }
  }

  return (
    <Card className="border-dashed">
      <div
        className={cn(
          'rounded-2xl border border-dashed bg-stone-50 p-8 text-center transition dark:bg-slate-950',
          isDragging && 'border-family-accent bg-family-accent/10',
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
        <p className="text-lg font-semibold">Drag-and-drop загрузка в MinIO</p>
        <p className="mt-2 text-sm text-stone-500 dark:text-slate-400">
          Поддерживаются JPEG, PNG, WebP, PDF, MP4 и MP3. Metadata сохраняется в PostgreSQL.
        </p>

        <div className="mx-auto mt-5 grid max-w-xl gap-3 md:grid-cols-[1fr_220px]">
          <Input placeholder="Person ID для привязки" value={personId} onChange={(event) => setPersonId(event.target.value)} />
          <Select defaultValue="person">
            <option value="person">Привязать к человеку</option>
          </Select>
        </div>

        <input
          ref={inputRef}
          className="hidden"
          type="file"
          accept={allowedMimeTypes.join(',')}
          onChange={(event) => void handleFiles(event.target.files)}
        />

        <Button className="mt-5" type="button" onClick={() => inputRef.current?.click()}>
          Выбрать файл
        </Button>

        <div className="mt-6 h-3 overflow-hidden rounded-full bg-white dark:bg-slate-900">
          <div className="h-full rounded-full bg-family-accent transition-all" style={{ width: `${progress}%` }} />
        </div>
        <p className="mt-3 text-sm text-stone-600 dark:text-slate-300">{status}</p>
      </div>
    </Card>
  );
}
