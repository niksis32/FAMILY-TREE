'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/components/auth-provider';
import { Button, Card, EmptyState, Input, Select, Textarea } from '@/components/ui';
import { apiClient, type CitationRecord, type DocumentRecord, type SourceRecord } from '@/lib/api-client';
import { useFormatApiError } from '@/lib/use-format-api-error';

const DOCUMENT_TYPE_KEYS = [
  'BIRTH_CERTIFICATE',
  'DEATH_CERTIFICATE',
  'MARRIAGE_CERTIFICATE',
  'PHOTO',
  'ARCHIVE_RECORD',
  'PASSPORT',
  'MILITARY_RECORD',
  'OTHER',
] as const;

function useArchiveDocumentTypeLabel() {
  const t = useTranslations('archiveDocumentTypes');
  return (type: string) => {
    if ((DOCUMENT_TYPE_KEYS as readonly string[]).includes(type)) {
      return t(type as (typeof DOCUMENT_TYPE_KEYS)[number]);
    }
    return type;
  };
}

export function DocumentsWorkspace() {
  const { session } = useAuth();
  const t = useTranslations('documentsWorkspace');
  const tDocType = useTranslations('archiveDocumentTypes');
  const documentTypeLabel = useArchiveDocumentTypeLabel();
  const formatApiError = useFormatApiError();
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [sources, setSources] = useState<SourceRecord[]>([]);
  const [citations, setCitations] = useState<CitationRecord[]>([]);
  const [documentForm, setDocumentForm] = useState({
    title: '',
    documentType: 'OTHER',
    mimeType: 'application/pdf',
    bucket: 'family-documents',
    storageKey: '',
    personId: '',
    sourceId: '',
    description: '',
  });
  const [sourceForm, setSourceForm] = useState({ title: '', author: '', repository: '', url: '', notes: '' });
  const [citationForm, setCitationForm] = useState({ sourceId: '', personId: '', page: '', detail: '' });
  const [status, setStatus] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  async function load() {
    setStatus(t('loading'));
    try {
      const [nextDocuments, nextSources, nextCitations] = await Promise.all([
        apiClient.documents.list(session?.accessToken),
        apiClient.sources.list(session?.accessToken),
        apiClient.citations.list(session?.accessToken),
      ]);
      setDocuments(nextDocuments);
      setSources(nextSources);
      setCitations(nextCitations);
      setStatus(
        t('stats', {
          documents: nextDocuments.length,
          sources: nextSources.length,
          citations: nextCitations.length,
        }),
      );
    } catch (error) {
      setStatus(formatApiError(error));
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.accessToken]);

  async function createDocument(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    try {
      await apiClient.documents.create(
        {
          ...documentForm,
          personId: documentForm.personId || undefined,
          sourceId: documentForm.sourceId || undefined,
          description: documentForm.description || undefined,
        },
        session?.accessToken,
      );
      setDocumentForm({
        title: '',
        documentType: 'OTHER',
        mimeType: 'application/pdf',
        bucket: 'family-documents',
        storageKey: '',
        personId: '',
        sourceId: '',
        description: '',
      });
      await load();
      setStatus(t('documentCreated'));
    } catch (error) {
      setStatus(formatApiError(error));
    } finally {
      setIsSaving(false);
    }
  }

  async function createSource(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    try {
      await apiClient.sources.create(
        {
          ...sourceForm,
          author: sourceForm.author || undefined,
          repository: sourceForm.repository || undefined,
          url: sourceForm.url || undefined,
          notes: sourceForm.notes || undefined,
        },
        session?.accessToken,
      );
      setSourceForm({ title: '', author: '', repository: '', url: '', notes: '' });
      await load();
      setStatus(t('sourceCreated'));
    } catch (error) {
      setStatus(formatApiError(error));
    } finally {
      setIsSaving(false);
    }
  }

  async function createCitation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    try {
      await apiClient.citations.create(
        {
          sourceId: citationForm.sourceId,
          personId: citationForm.personId || undefined,
          page: citationForm.page || undefined,
          detail: citationForm.detail || undefined,
        },
        session?.accessToken,
      );
      setCitationForm({ sourceId: '', personId: '', page: '', detail: '' });
      await load();
      setStatus(t('citationCreated'));
    } catch (error) {
      setStatus(formatApiError(error));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-stone-500 dark:text-slate-400">{status}</p>
      <div className="grid gap-6 xl:grid-cols-3">
        <Card>
          <h2 className="text-xl font-semibold">{t('documentMetaTitle')}</h2>
          <form className="mt-5 space-y-4" onSubmit={createDocument}>
            <Input
              value={documentForm.title}
              onChange={(event) => setDocumentForm({ ...documentForm, title: event.target.value })}
              placeholder={t('titlePh')}
              required
            />
            <Select
              value={documentForm.documentType}
              onChange={(event) => setDocumentForm({ ...documentForm, documentType: event.target.value })}
            >
              {DOCUMENT_TYPE_KEYS.map((type) => (
                <option key={type} value={type}>
                  {tDocType(type)}
                </option>
              ))}
            </Select>
            <Input
              value={documentForm.storageKey}
              onChange={(event) => setDocumentForm({ ...documentForm, storageKey: event.target.value })}
              placeholder={t('minioKeyPh')}
              required
            />
            <Input
              value={documentForm.personId}
              onChange={(event) => setDocumentForm({ ...documentForm, personId: event.target.value })}
              placeholder={t('personIdPh')}
            />
            <Input
              value={documentForm.sourceId}
              onChange={(event) => setDocumentForm({ ...documentForm, sourceId: event.target.value })}
              placeholder={t('sourceIdPh')}
            />
            <Textarea
              value={documentForm.description}
              onChange={(event) => setDocumentForm({ ...documentForm, description: event.target.value })}
              placeholder={t('descriptionPh')}
            />
            <Button disabled={isSaving || !session} type="submit">
              {t('createDocument')}
            </Button>
          </form>
        </Card>

        <Card>
          <h2 className="text-xl font-semibold">{t('sourceTitle')}</h2>
          <form className="mt-5 space-y-4" onSubmit={createSource}>
            <Input
              value={sourceForm.title}
              onChange={(event) => setSourceForm({ ...sourceForm, title: event.target.value })}
              placeholder={t('sourceNamePh')}
              required
            />
            <Input
              value={sourceForm.author}
              onChange={(event) => setSourceForm({ ...sourceForm, author: event.target.value })}
              placeholder={t('authorPh')}
            />
            <Input
              value={sourceForm.repository}
              onChange={(event) => setSourceForm({ ...sourceForm, repository: event.target.value })}
              placeholder={t('repositoryPh')}
            />
            <Input
              value={sourceForm.url}
              onChange={(event) => setSourceForm({ ...sourceForm, url: event.target.value })}
              placeholder="URL"
            />
            <Textarea
              value={sourceForm.notes}
              onChange={(event) => setSourceForm({ ...sourceForm, notes: event.target.value })}
              placeholder={t('notesPh')}
            />
            <Button disabled={isSaving || !session} type="submit">
              {t('createSource')}
            </Button>
          </form>
        </Card>

        <Card>
          <h2 className="text-xl font-semibold">{t('citationTitle')}</h2>
          <form className="mt-5 space-y-4" onSubmit={createCitation}>
            <Input
              value={citationForm.sourceId}
              onChange={(event) => setCitationForm({ ...citationForm, sourceId: event.target.value })}
              placeholder={t('sourceIdPh')}
              required
            />
            <Input
              value={citationForm.personId}
              onChange={(event) => setCitationForm({ ...citationForm, personId: event.target.value })}
              placeholder={t('personIdPh')}
            />
            <Input
              value={citationForm.page}
              onChange={(event) => setCitationForm({ ...citationForm, page: event.target.value })}
              placeholder={t('pagePh')}
            />
            <Textarea
              value={citationForm.detail}
              onChange={(event) => setCitationForm({ ...citationForm, detail: event.target.value })}
              placeholder={t('citationDetailPh')}
            />
            <Button disabled={isSaving || !session} type="submit">
              {t('createCitation')}
            </Button>
          </form>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <List
          title={t('listDocuments')}
          empty={t('noDocuments')}
          backendEmpty={t('backendEmpty')}
          items={documents.map((item) => ({
            id: item.id,
            title: item.title,
            subtitle: documentTypeLabel(item.documentType),
          }))}
        />
        <List
          title={t('listSources')}
          empty={t('noSources')}
          backendEmpty={t('backendEmpty')}
          items={sources.map((item) => ({
            id: item.id,
            title: item.title,
            subtitle: item.repository ?? item.author ?? item.id,
          }))}
        />
        <List
          title={t('listCitations')}
          empty={t('noCitations')}
          backendEmpty={t('backendEmpty')}
          items={citations.map((item) => ({
            id: item.id,
            title: item.sourceId,
            subtitle: item.detail ?? item.page ?? item.id,
          }))}
        />
      </div>
    </div>
  );
}

function List({
  title,
  empty,
  backendEmpty,
  items,
}: {
  title: string;
  empty: string;
  backendEmpty: string;
  items: Array<{ id: string; title: string; subtitle: string }>;
}) {
  return (
    <Card>
      <h2 className="text-xl font-semibold">{title}</h2>
      <div className="mt-4 space-y-3">
        {items.length === 0 ? <EmptyState title={empty} description={backendEmpty} /> : null}
        {items.map((item) => (
          <div key={item.id} className="rounded-2xl border bg-stone-50 p-4 text-sm dark:bg-slate-950">
            <p className="font-semibold">{item.title}</p>
            <p className="mt-1 text-stone-500 dark:text-slate-400">{item.subtitle}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}
