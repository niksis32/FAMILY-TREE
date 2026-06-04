import { apiClient, type MediaUploadUrlResponse } from '@/lib/api-client';

export type UploadProgressHandler = (percent: number, phase: string) => void;

export async function putFileWithProgress(
  uploadUrl: string,
  file: File,
  onProgress?: UploadProgressHandler,
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', uploadUrl);
    xhr.setRequestHeader('Content-Type', file.type);

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable || !onProgress) return;
      const pct = Math.round((event.loaded / event.total) * 100);
      onProgress(pct, 'uploading');
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.(100, 'uploaded');
        resolve();
      } else {
        reject(new Error(`Storage upload failed (${xhr.status})`));
      }
    };

    xhr.onerror = () => reject(new Error('Network error during storage upload'));
    xhr.send(file);
  });
}

export async function withRetry<T>(fn: () => Promise<T>, attempts = 3, delayMs = 800): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i < attempts; i += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (i < attempts - 1) {
        await new Promise((r) => setTimeout(r, delayMs * (i + 1)));
      }
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Operation failed');
}

export async function uploadMediaAsset(
  file: File,
  token: string | null | undefined,
  options?: {
    personId?: string;
    title?: string;
    onProgress?: UploadProgressHandler;
  },
): Promise<{ id: string }> {
  const presigned: MediaUploadUrlResponse = await apiClient.media.uploadUrl(
    { fileName: file.name, mimeType: file.type, sizeBytes: file.size },
    token,
  );

  options?.onProgress?.(5, 'presigned');
  await putFileWithProgress(presigned.uploadUrl, file, options?.onProgress);
  options?.onProgress?.(90, 'metadata');

  const created = (await apiClient.media.metadata(
    {
      fileName: file.name,
      mimeType: file.type,
      sizeBytes: file.size,
      storageKey: presigned.storageKey,
      title: options?.title ?? file.name,
      personId: options?.personId,
    },
    token,
  )) as { id: string };

  options?.onProgress?.(100, 'done');
  return created;
}

export async function uploadDocumentAsset(
  file: File,
  token: string | null | undefined,
  meta: {
    title: string;
    documentType: string;
    personId?: string;
    sourceId?: string;
    description?: string;
  },
  onProgress?: UploadProgressHandler,
) {
  const presigned = await apiClient.documents.uploadUrl(
    { fileName: file.name, mimeType: file.type, sizeBytes: file.size },
    token,
  );

  onProgress?.(5, 'presigned');
  await putFileWithProgress(presigned.uploadUrl, file, onProgress);
  onProgress?.(90, 'metadata');

  const document = await apiClient.documents.create(
    {
      title: meta.title,
      documentType: meta.documentType,
      mimeType: file.type,
      storageKey: presigned.storageKey,
      bucket: presigned.bucket,
      personId: meta.personId,
      sourceId: meta.sourceId,
      description: meta.description,
    },
    token,
  );

  onProgress?.(100, 'done');
  return document;
}
