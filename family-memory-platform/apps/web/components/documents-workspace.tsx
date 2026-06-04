'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { FileText, Plus, Sparkles } from 'lucide-react';
import { RecordList, WorkspacePanel } from '@family/ui';
import { Link } from '@/i18n/navigation';
import { useAuth } from '@/components/auth-provider';
import { Button, FormField, Input, Select, Textarea } from '@/components/ui';
import { apiClient, type CitationRecord, type DocumentRecord, type SourceRecord } from '@/lib/api-client';
import { useFormatApiError } from '@/lib/use-format-api-error';
import { DocumentFileUploader } from '@/components/document-file-uploader';
import { DocumentIntelligenceModal } from '@/features/document-intelligence/document-intelligence-modal';
import { cn } from '@/lib/utils';

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

type WorkspaceTab = 'documents' | 'sources' | 'citations';

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

  const [tab, setTab] = useState<WorkspaceTab>('documents');
  const [showForm, setShowForm] = useState(false);
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
  const [intelligenceDocId, setIntelligenceDocId] = useState<string | null>(null);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);

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
      setShowForm(false);
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
      setShowForm(false);
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
      setShowForm(false);
      await load();
      setStatus(t('citationCreated'));
    } catch (error) {
      setStatus(formatApiError(error));
    } finally {
      setIsSaving(false);
    }
  }

  const tabs: { id: WorkspaceTab; label: string; count: number }[] = [
    { id: 'documents', label: t('tabDocuments'), count: documents.length },
    { id: 'sources', label: t('tabSources'), count: sources.length },
    { id: 'citations', label: t('tabCitations'), count: citations.length },
  ];

  return (
    <div className="space-y-6">
      {intelligenceDocId ? (
        <DocumentIntelligenceModal
          documentId={intelligenceDocId}
          documentTitle={documents.find((d) => d.id === intelligenceDocId)?.title ?? null}
          token={session?.accessToken ?? null}
          onClose={() => setIntelligenceDocId(null)}
        />
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-family-accent/15 bg-family-accent/5 px-4 py-3 text-sm text-stone-600 dark:text-slate-300">
        <span>{status}</span>
        <Link href="/ai-lab" className="inline-flex items-center gap-1 font-semibold text-family-primary dark:text-family-accent">
          <Sparkles className="h-4 w-4" />
          {t('aiLabLink')}
        </Link>
      </div>

      {tab === 'documents' ? <DocumentFileUploader onUploaded={() => void load()} /> : null}

      <div className="flex flex-wrap gap-2">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              setTab(item.id);
              setShowForm(false);
            }}
            className={cn(
              'rounded-2xl px-4 py-2 text-sm font-semibold transition',
              tab === item.id
                ? 'bg-family-primary text-white shadow-md dark:bg-family-accent dark:text-family-ink'
                : 'bg-white/80 text-stone-600 hover:bg-stone-100 dark:bg-slate-900 dark:text-slate-300',
            )}
          >
            {item.label}
            <span className="ml-2 opacity-70">({item.count})</span>
          </button>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <WorkspacePanel
          title={tab === 'documents' ? t('listDocuments') : tab === 'sources' ? t('listSources') : t('listCitations')}
          description={t('listHint')}
          action={
            <Button type="button" variant="secondary" onClick={() => setShowForm((v) => !v)}>
              <Plus className="mr-1 inline h-4 w-4" />
              {showForm ? t('hideForm') : t('showForm')}
            </Button>
          }
        >
          {tab === 'documents' ? (
            <RecordList
              emptyTitle={t('noDocuments')}
              emptyDescription={t('backendEmpty')}
              items={documents.map((item) => ({
                id: item.id,
                title: item.title,
                subtitle: documentTypeLabel(item.documentType),
                meta: item.storageKey,
                active: selectedDocId === item.id,
                onSelect: () => setSelectedDocId(item.id),
                actions: (
                  <>
                    <Button type="button" variant="secondary" disabled={!session} onClick={() => setIntelligenceDocId(item.id)}>
                      {t('intelligenceModal')}
                    </Button>
                    <Link
                      href={`/documents/${item.id}/intelligence`}
                      className="inline-flex items-center justify-center rounded-xl border px-3 py-2 text-xs font-semibold text-family-primary dark:text-family-accent"
                    >
                      {t('intelligenceFullPage')}
                    </Link>
                  </>
                ),
              }))}
            />
          ) : null}

          {tab === 'sources' ? (
            <RecordList
              emptyTitle={t('noSources')}
              emptyDescription={t('backendEmpty')}
              items={sources.map((item) => ({
                id: item.id,
                title: item.title,
                subtitle: item.repository ?? item.author ?? item.id,
              }))}
            />
          ) : null}

          {tab === 'citations' ? (
            <RecordList
              emptyTitle={t('noCitations')}
              emptyDescription={t('backendEmpty')}
              items={citations.map((item) => ({
                id: item.id,
                title: item.sourceId,
                subtitle: item.detail ?? item.page ?? item.id,
              }))}
            />
          ) : null}
        </WorkspacePanel>

        {showForm ? (
          <WorkspacePanel
            title={
              tab === 'documents'
                ? t('documentMetaTitle')
                : tab === 'sources'
                  ? t('sourceTitle')
                  : t('citationTitle')
            }
            description={t('formHint')}
          >
            {tab === 'documents' ? (
              <form className="space-y-4" onSubmit={createDocument}>
                <FormField label={t('titlePh')}>
                  <Input
                    value={documentForm.title}
                    onChange={(e) => setDocumentForm({ ...documentForm, title: e.target.value })}
                    required
                  />
                </FormField>
                <FormField label={t('typeLabel')}>
                  <Select
                    value={documentForm.documentType}
                    onChange={(e) => setDocumentForm({ ...documentForm, documentType: e.target.value })}
                  >
                    {DOCUMENT_TYPE_KEYS.map((type) => (
                      <option key={type} value={type}>
                        {tDocType(type)}
                      </option>
                    ))}
                  </Select>
                </FormField>
                <FormField label={t('minioKeyPh')}>
                  <Input
                    value={documentForm.storageKey}
                    onChange={(e) => setDocumentForm({ ...documentForm, storageKey: e.target.value })}
                    required
                  />
                </FormField>
                <FormField label={t('personIdPh')}>
                  <Input
                    value={documentForm.personId}
                    onChange={(e) => setDocumentForm({ ...documentForm, personId: e.target.value })}
                  />
                </FormField>
                <FormField label={t('descriptionPh')}>
                  <Textarea
                    value={documentForm.description}
                    onChange={(e) => setDocumentForm({ ...documentForm, description: e.target.value })}
                  />
                </FormField>
                <Button disabled={isSaving || !session} type="submit">
                  {t('createDocument')}
                </Button>
              </form>
            ) : null}

            {tab === 'sources' ? (
              <form className="space-y-4" onSubmit={createSource}>
                <FormField label={t('sourceNamePh')}>
                  <Input value={sourceForm.title} onChange={(e) => setSourceForm({ ...sourceForm, title: e.target.value })} required />
                </FormField>
                <FormField label={t('authorPh')}>
                  <Input value={sourceForm.author} onChange={(e) => setSourceForm({ ...sourceForm, author: e.target.value })} />
                </FormField>
                <FormField label={t('repositoryPh')}>
                  <Input value={sourceForm.repository} onChange={(e) => setSourceForm({ ...sourceForm, repository: e.target.value })} />
                </FormField>
                <Button disabled={isSaving || !session} type="submit">
                  {t('createSource')}
                </Button>
              </form>
            ) : null}

            {tab === 'citations' ? (
              <form className="space-y-4" onSubmit={createCitation}>
                <FormField label={t('sourceIdPh')}>
                  <Input
                    value={citationForm.sourceId}
                    onChange={(e) => setCitationForm({ ...citationForm, sourceId: e.target.value })}
                    required
                  />
                </FormField>
                <FormField label={t('pagePh')}>
                  <Input value={citationForm.page} onChange={(e) => setCitationForm({ ...citationForm, page: e.target.value })} />
                </FormField>
                <Button disabled={isSaving || !session} type="submit">
                  {t('createCitation')}
                </Button>
              </form>
            ) : null}
          </WorkspacePanel>
        ) : (
          <WorkspacePanel title={t('workspaceTipsTitle')} description={t('workspaceTipsDesc')}>
            <ul className="space-y-3 text-sm text-stone-600 dark:text-slate-300">
              <li className="flex gap-2">
                <FileText className="mt-0.5 h-4 w-4 shrink-0 text-family-accent" />
                {t('tipIntelligence')}
              </li>
              <li className="flex gap-2">
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-family-accent" />
                {t('tipAiLab')}
              </li>
            </ul>
          </WorkspacePanel>
        )}
      </div>
    </div>
  );
}
