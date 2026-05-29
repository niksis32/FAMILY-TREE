'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ImageIcon } from 'lucide-react';
import type { BulkTaggingMediaItem, PersonSummary } from '@family/shared';
import { RecordList, WorkspacePanel } from '@family/ui';
import { useAuth } from '@/components/auth-provider';
import { Button, FormField, Select } from '@/components/ui';
import { Link } from '@/i18n/navigation';
import { apiClient } from '@/lib/api-client';
import { PhotoViewerWithTags } from './photo-viewer-with-tags';

export function BulkTaggingWorkspace() {
  const { session } = useAuth();
  const t = useTranslations('photoIntelligence');
  const [queue, setQueue] = useState<BulkTaggingMediaItem[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [persons, setPersons] = useState<PersonSummary[]>([]);
  const [bulkPersonId, setBulkPersonId] = useState('');

  const reloadQueue = () => {
    void apiClient.photoIntelligence.bulkQueue(session?.accessToken).then((items) => {
      setQueue(items);
      if (!activeId && items[0]) setActiveId(items[0].id);
    });
  };

  useEffect(() => {
    reloadQueue();
    void apiClient.persons.list(session?.accessToken).then((list) => setPersons(list as PersonSummary[]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.accessToken]);

  const assignAllUntagged = async () => {
    if (!activeId || !bulkPersonId) return;
    const workspace = await apiClient.photoIntelligence.workspace(activeId, session?.accessToken);
    const untagged = workspace.faceTags.filter((tag) => !tag.personId);
    if (untagged.length === 0) return;
    await apiClient.photoIntelligence.bulkAssign(
      untagged.map((tag) => ({ faceTagId: tag.id, personId: bulkPersonId })),
      session?.accessToken,
    );
    reloadQueue();
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(280px,360px)_1fr]">
      <WorkspacePanel title={t('bulkQueueTitle')} description={t('bulkQueueHint', { count: queue.length })}>
        <RecordList
          emptyTitle={t('bulkEmpty')}
          items={queue.map((item) => ({
            id: item.id,
            title: item.title ?? item.id,
            subtitle: t('bulkItemStats', {
              untagged: item.untaggedFaceCount,
              tagged: item.taggedFaceCount,
            }),
            active: activeId === item.id,
            onSelect: () => setActiveId(item.id),
          }))}
        />
      </WorkspacePanel>

      <WorkspacePanel
        title={t('bulkEditorTitle')}
        description={activeId ? t('bulkEditorActive') : t('bulkEmpty')}
        action={
          activeId ? (
            <Link href={`/media/${activeId}`} className="text-sm font-semibold text-family-primary dark:text-family-accent">
              {t('openFullPage')} →
            </Link>
          ) : null
        }
      >
        {activeId ? (
          <div className="space-y-5">
            <div className="flex flex-wrap items-end gap-4 rounded-2xl border border-family-accent/20 bg-family-accent/5 p-4 dark:bg-slate-950/50">
              <FormField label={t('bulkAssignAll')} className="min-w-[12rem] flex-1">
                <Select value={bulkPersonId} onChange={(e) => setBulkPersonId(e.target.value)}>
                  <option value="">{t('selectPersonPlaceholder')}</option>
                  {persons.map((p) => (
                    <option key={p.id} value={p.id}>
                      {[p.givenName, p.familyName].filter(Boolean).join(' ')}
                    </option>
                  ))}
                </Select>
              </FormField>
              <Button onClick={() => void assignAllUntagged()} disabled={!bulkPersonId}>
                {t('applyBulkAssign')}
              </Button>
            </div>
            <PhotoViewerWithTags mediaId={activeId} />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center text-stone-500">
            <ImageIcon className="mb-3 h-10 w-10 text-family-accent/60" />
            <p>{t('bulkSelectHint')}</p>
          </div>
        )}
      </WorkspacePanel>
    </div>
  );
}
