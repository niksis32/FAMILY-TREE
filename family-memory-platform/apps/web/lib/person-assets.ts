import { apiClient, type DocumentRecord, type MediaUploadUrlResponse } from '@/lib/api-client';

export type DocumentTypeOption =
  | 'PASSPORT'
  | 'BIRTH_CERTIFICATE'
  | 'DEATH_CERTIFICATE'
  | 'MARRIAGE_CERTIFICATE'
  | 'MILITARY_RECORD'
  | 'ARCHIVE_RECORD'
  | 'OTHER';

export const DOCUMENT_TYPE_LABELS: Record<DocumentTypeOption, string> = {
  PASSPORT: 'Паспорт',
  BIRTH_CERTIFICATE: 'Свидетельство о рождении',
  DEATH_CERTIFICATE: 'Свидетельство о смерти',
  MARRIAGE_CERTIFICATE: 'Свидетельство о браке',
  MILITARY_RECORD: 'Военный документ',
  ARCHIVE_RECORD: 'Архивная запись',
  OTHER: 'Другой документ',
};

export type PersonAttachmentDraft = {
  avatarFile: File | null;
  avatarPreview: string | null;
  mediaFiles: File[];
  documents: { file: File; documentType: DocumentTypeOption; title: string }[];
};

export const emptyPersonAttachments = (): PersonAttachmentDraft => ({
  avatarFile: null,
  avatarPreview: null,
  mediaFiles: [],
  documents: [],
});

async function putToMinio(uploadUrl: string, file: File) {
  const res = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type },
    body: file,
  });
  if (!res.ok) {
    throw new Error(`Не удалось загрузить файл в хранилище (${res.status})`);
  }
}

export async function uploadPersonMedia(
  file: File,
  personId: string,
  token: string | null | undefined,
  title?: string,
): Promise<{ id: string }> {
  const presigned: MediaUploadUrlResponse = await apiClient.media.uploadUrl(
    { fileName: file.name, mimeType: file.type, sizeBytes: file.size },
    token,
  );
  await putToMinio(presigned.uploadUrl, file);
  const created = (await apiClient.media.metadata(
    {
      fileName: file.name,
      mimeType: file.type,
      sizeBytes: file.size,
      storageKey: presigned.storageKey,
      title: title ?? file.name,
      personId,
    },
    token,
  )) as { id: string };
  return created;
}

export async function uploadPersonDocument(
  file: File,
  personId: string,
  documentType: DocumentTypeOption,
  title: string,
  token: string | null | undefined,
): Promise<DocumentRecord> {
  const presigned = await apiClient.documents.uploadUrl(
    { fileName: file.name, mimeType: file.type, sizeBytes: file.size },
    token,
  );
  await putToMinio(presigned.uploadUrl, file);
  return apiClient.documents.create(
    {
      title,
      documentType,
      mimeType: file.type,
      storageKey: presigned.storageKey,
      bucket: presigned.bucket,
      personId,
    },
    token,
  );
}

export async function attachAssetsToPerson(
  personId: string,
  draft: PersonAttachmentDraft,
  token: string | null | undefined,
) {
  if (draft.avatarFile) {
    const avatar = await uploadPersonMedia(draft.avatarFile, personId, token, 'Аватар');
    await apiClient.persons.update(personId, { avatarMediaId: avatar.id }, token);
  }

  for (const file of draft.mediaFiles) {
    await uploadPersonMedia(file, personId, token);
  }

  for (const item of draft.documents) {
    await uploadPersonDocument(item.file, personId, item.documentType, item.title || item.file.name, token);
  }
}
