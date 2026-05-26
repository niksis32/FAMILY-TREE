'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { BulkTaggingMediaItem, PersonSummary } from '@family/shared';
import { useAuth } from '@/components/auth-provider';
import { Button, Card } from '@/components/ui';
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
    <div className="grid gap-6 xl:grid-cols-[320px_1fr]">
      <Card className="p-4">
        <h3 className="font-semibold">{t('bulkQueueTitle')}</h3>
        <p className="mt-1 text-sm text-stone-500">{t('bulkQueueHint', { count: queue.length })}</p>
        <ul className="mt-4 max-h-[70vh] space-y-2 overflow-y-auto">
          {queue.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                className={`w-full rounded-xl border px-3 py-2 text-left text-sm ${
                  activeId === item.id ? 'border-family-primary bg-family-primary/5' : ''
                }`}
                onClick={() => setActiveId(item.id)}
              >
                <p className="font-medium">{item.title ?? item.id}</p>
                <p className="text-xs text-stone-500">
                  {t('bulkItemStats', {
                    untagged: item.untaggedFaceCount,
                    tagged: item.taggedFaceCount,
                  })}
                </p>
              </button>
            </li>
          ))}
        </ul>
      </Card>

      <div className="space-y-4">
        {activeId ? (
          <>
            <div className="flex flex-wrap items-end gap-3">
              <label className="text-sm">
                <span className="text-stone-500">{t('bulkAssignAll')}</span>
                <select
                  className="ml-2 rounded-xl border bg-transparent px-3 py-2"
                  value={bulkPersonId}
                  onChange={(e) => setBulkPersonId(e.target.value)}
                >
                  <option value="">{t('selectPersonPlaceholder')}</option>
                  {persons.map((p) => (
                    <option key={p.id} value={p.id}>
                      {[p.givenName, p.familyName].filter(Boolean).join(' ')}
                    </option>
                  ))}
                </select>
              </label>
              <Button onClick={() => void assignAllUntagged()} disabled={!bulkPersonId}>
                {t('applyBulkAssign')}
              </Button>
              <Link href={`/media/${activeId}`} className="text-sm text-family-primary hover:underline">
                {t('openFullPage')}
              </Link>
            </div>
            <PhotoViewerWithTags mediaId={activeId} />
          </>
        ) : (
          <p className="text-stone-500">{t('bulkEmpty')}</p>
        )}
      </div>
    </div>
  );
}
