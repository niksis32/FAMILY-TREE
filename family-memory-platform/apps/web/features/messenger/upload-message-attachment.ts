import { apiClient } from '@/lib/api-client';

export async function uploadMessageAttachment(file: File, token: string): Promise<string> {
  const upload = await apiClient.media.uploadUrl(
    { fileName: file.name, mimeType: file.type || 'application/octet-stream', sizeBytes: file.size },
    token,
  );

  const putRes = await fetch(upload.uploadUrl, {
    method: 'PUT',
    body: file,
    headers: { 'Content-Type': file.type || 'application/octet-stream' },
  });
  if (!putRes.ok) {
    throw new Error(`Upload failed: ${putRes.status}`);
  }

  const media = (await apiClient.media.metadata(
    {
      fileName: file.name,
      mimeType: file.type || 'application/octet-stream',
      sizeBytes: file.size,
      storageKey: upload.storageKey,
      title: file.name,
    },
    token,
  )) as { id: string };

  return media.id;
}
