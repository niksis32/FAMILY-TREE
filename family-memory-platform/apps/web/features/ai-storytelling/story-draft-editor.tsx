'use client';

import { useEffect, useState } from 'react';
import type { StoryDraftDto, UpdateStoryDraftRequestDto } from '@family/shared';
import { Button, Textarea } from '@/components/ui';

export function StoryDraftEditor({
  draft,
  disabled,
  onSave,
}: {
  draft: StoryDraftDto | null;
  disabled?: boolean;
  onSave: (patch: UpdateStoryDraftRequestDto) => Promise<void>;
}) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setText(draft?.narrative ?? '');
  }, [draft?.id]);

  if (!draft) return null;

  const isSame = (draft.narrative ?? '') === text;

  return (
    <div className="rounded-3xl border p-5 dark:border-slate-800">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">Черновик (StoryDraftEditor)</p>
          <p className="mt-1 text-xs text-stone-500 dark:text-slate-400">
            Редактирование всегда вручную: AI не вносит изменения в дерево автоматически.
          </p>
        </div>
        <Button
          type="button"
          variant="secondary"
          disabled={disabled || busy || isSame}
          onClick={async () => {
            setBusy(true);
            try {
              await onSave({ narrative: text });
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? 'Сохраняем…' : 'Сохранить черновик'}
        </Button>
      </div>

      <div className="mt-4">
        <Textarea value={text} onChange={(e) => setText(e.target.value)} disabled={disabled || busy} />
      </div>
    </div>
  );
}

