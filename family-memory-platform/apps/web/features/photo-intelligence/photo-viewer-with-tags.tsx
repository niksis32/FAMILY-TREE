'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { PersonSummary } from '@family/shared';
import { useAuth } from '@/components/auth-provider';
import { Button, Card } from '@/components/ui';
import { apiClient } from '@/lib/api-client';
import { FaceBoxOverlay } from './face-box-overlay';
import { FaceTagEditor } from './face-tag-editor';
import { PhotoAiDegradationBanner } from './photo-ai-degradation-banner';
import { PersonTagPopover } from './person-tag-popover';
import { SuggestedPersonMatchPanel } from './suggested-person-match-panel';
import { usePhotoWorkspace } from './use-photo-workspace';

interface PhotoViewerWithTagsProps {
  mediaId: string;
  compact?: boolean;
}

export function PhotoViewerWithTags({ mediaId, compact }: PhotoViewerWithTagsProps) {
  const { session } = useAuth();
  const t = useTranslations('photoIntelligence');
  const { workspace, loading, error, reload } = usePhotoWorkspace(mediaId, session?.accessToken);
  const [persons, setPersons] = useState<PersonSummary[]>([]);
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [draftBox, setDraftBox] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);
  const [editorPersonId, setEditorPersonId] = useState('');
  const [editorLabel, setEditorLabel] = useState('');
  const [editorNote, setEditorNote] = useState('');
  const [commentBody, setCommentBody] = useState('');
  const imageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void apiClient.persons.list(session?.accessToken).then((list) => setPersons(list as PersonSummary[]));
  }, [session?.accessToken]);

  const selectedTag = workspace?.faceTags.find((tag) => tag.id === selectedTagId) ?? null;

  const startManualBox = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (!imageRef.current || editing) return;
    const rect = imageRef.current.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    setDrawStart({ x, y });
    setDraftBox({ x, y, width: 0.01, height: 0.01 });
  }, [editing]);

  const updateManualBox = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (!drawStart || !imageRef.current) return;
      const rect = imageRef.current.getBoundingClientRect();
      const x2 = (event.clientX - rect.left) / rect.width;
      const y2 = (event.clientY - rect.top) / rect.height;
      const x = Math.min(drawStart.x, x2);
      const y = Math.min(drawStart.y, y2);
      const width = Math.max(0.02, Math.abs(x2 - drawStart.x));
      const height = Math.max(0.02, Math.abs(y2 - drawStart.y));
      setDraftBox({ x, y, width, height });
    },
    [drawStart],
  );

  const finishManualBox = useCallback(async () => {
    if (!draftBox || draftBox.width < 0.02 || draftBox.height < 0.02) {
      setDrawStart(null);
      setDraftBox(null);
      return;
    }
    const created = await apiClient.photoIntelligence.createFaceTag(
      mediaId,
      { ...draftBox, label: t('manualFace') },
      session?.accessToken,
    );
    setDrawStart(null);
    setDraftBox(null);
    setSelectedTagId(created.id);
    setEditing(true);
    setEditorLabel(created.label ?? '');
    setEditorNote(created.note ?? '');
    await reload();
  }, [draftBox, mediaId, reload, session?.accessToken, t]);

  const saveTagPerson = useCallback(async () => {
    if (!selectedTagId || !editorPersonId) return;
    await apiClient.photoIntelligence.updateFaceTag(
      mediaId,
      selectedTagId,
      { personId: editorPersonId, label: editorLabel, note: editorNote },
      session?.accessToken,
    );
    setEditing(false);
    await reload();
  }, [editorLabel, editorNote, editorPersonId, mediaId, reload, selectedTagId, session?.accessToken]);

  const enqueueAnalysis = useCallback(async () => {
    if (!workspace?.aiQueueAvailable || !workspace.aiEnabled) return;
    await apiClient.photoIntelligence.enqueueAnalysis(mediaId, session?.accessToken);
    await reload();
  }, [mediaId, reload, session?.accessToken, workspace?.aiEnabled, workspace?.aiQueueAvailable]);

  const addComment = useCallback(async () => {
    if (!commentBody.trim()) return;
    await apiClient.photoIntelligence.addComment(mediaId, commentBody.trim(), session?.accessToken);
    setCommentBody('');
    await reload();
  }, [commentBody, mediaId, reload, session?.accessToken]);

  if (loading && !workspace) {
    return <p className="text-sm text-stone-500">{t('loading')}</p>;
  }

  if (error) {
    return <p className="text-sm text-red-600">{error}</p>;
  }

  if (!workspace) return null;

  const canRunAiAnalysis = workspace.aiEnabled && workspace.aiQueueAvailable;
  const aiButtonLabel = !workspace.aiEnabled
    ? t('aiDisabled')
    : !workspace.aiQueueAvailable
      ? t('aiQueueUnavailableButton')
      : t('runAiAnalysis');

  return (
    <div className={compact ? 'space-y-4' : 'grid gap-6 xl:grid-cols-[1.4fr_0.9fr]'}>
      {!workspace.aiQueueAvailable ? <PhotoAiDegradationBanner /> : null}
      <div className="space-y-3">
        <div
          ref={imageRef}
          className="relative aspect-[4/3] overflow-hidden rounded-3xl bg-stone-900"
          onMouseDown={startManualBox}
          onMouseMove={updateManualBox}
          onMouseUp={() => void finishManualBox()}
          onMouseLeave={() => {
            if (drawStart) void finishManualBox();
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={workspace.media.downloadUrl}
            alt={workspace.media.title ?? 'Photo'}
            className="h-full w-full object-contain"
            draggable={false}
          />
          <FaceBoxOverlay
            tags={workspace.faceTags}
            selectedTagId={selectedTagId}
            draftBox={draftBox}
            onSelectTag={(id) => {
              setSelectedTagId(id);
              setEditing(false);
              const tag = workspace.faceTags.find((t) => t.id === id);
              setEditorPersonId(tag?.personId ?? '');
              setEditorLabel(tag?.label ?? '');
              setEditorNote(tag?.note ?? '');
            }}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" onClick={() => void enqueueAnalysis()} disabled={!canRunAiAnalysis}>
            {aiButtonLabel}
          </Button>
          <span className="text-xs text-stone-500 self-center">
            {workspace.analysisJob
              ? t('analysisStatus', { status: workspace.analysisJob.status })
              : t('noAnalysisYet')}
          </span>
        </div>
        {workspace.analysisJob?.status === 'SKIPPED' ? (
          <p className="text-xs text-amber-800 dark:text-amber-200/90">
            {workspace.analysisJob.error ?? t('analysisSkippedReason')}
          </p>
        ) : null}
        {workspace.insight?.aiDescription ? (
          <p className="text-sm text-stone-600 dark:text-slate-300">{workspace.insight.aiDescription}</p>
        ) : null}
      </div>

      <div className="space-y-4">
        {selectedTag && !editing ? (
          <PersonTagPopover
            tag={selectedTag}
            takenAt={workspace.media.takenAt}
            insight={workspace.insight}
            onEdit={() => setEditing(true)}
          />
        ) : null}

        {editing ? (
          <FaceTagEditor
            persons={persons}
            selectedPersonId={editorPersonId}
            label={editorLabel}
            note={editorNote}
            onPersonChange={setEditorPersonId}
            onLabelChange={setEditorLabel}
            onNoteChange={setEditorNote}
            onSave={() => void saveTagPerson()}
            onCancel={() => setEditing(false)}
          />
        ) : null}

        {selectedTag && !selectedTag.personId ? (
          <SuggestedPersonMatchPanel
            mediaId={mediaId}
            faceTagId={selectedTag.id}
            token={session?.accessToken}
            onSelect={(personId) => {
              setEditorPersonId(personId);
              setEditing(true);
            }}
          />
        ) : null}

        <Card className="p-4">
          <h4 className="font-semibold">{t('comments')}</h4>
          <ul className="mt-3 space-y-2 text-sm">
            {workspace.comments.map((c) => (
              <li key={c.id} className="rounded-xl bg-stone-50 px-3 py-2 dark:bg-slate-900">
                <p>{c.body}</p>
                <p className="mt-1 text-xs text-stone-400">
                  {c.author?.displayName ?? c.author?.email} · {new Date(c.createdAt).toLocaleString()}
                </p>
              </li>
            ))}
          </ul>
          <textarea
            className="mt-3 w-full rounded-xl border bg-transparent px-3 py-2 text-sm"
            rows={2}
            placeholder={t('commentPlaceholder')}
            value={commentBody}
            onChange={(e) => setCommentBody(e.target.value)}
          />
          <Button className="mt-2" onClick={() => void addComment()}>
            {t('addComment')}
          </Button>
        </Card>
      </div>
    </div>
  );
}
