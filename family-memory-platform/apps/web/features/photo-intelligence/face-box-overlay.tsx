'use client';

import type { PhotoFaceTagRecord } from '@family/shared';
import { PercentBox } from '@family/ui';
import { cn } from '@/lib/utils';

interface FaceBoxOverlayProps {
  tags: PhotoFaceTagRecord[];
  selectedTagId?: string | null;
  draftBox?: { x: number; y: number; width: number; height: number } | null;
  onSelectTag: (tagId: string) => void;
}

export function FaceBoxOverlay({ tags, selectedTagId, draftBox, onSelectTag }: FaceBoxOverlayProps) {
  return (
    <div className="pointer-events-none absolute inset-0">
      {tags.map((tag) => (
        <PercentBox
          key={tag.id}
          as="button"
          type="button"
          x={tag.x}
          y={tag.y}
          width={tag.width}
          height={tag.height}
          className={cn(
            'pointer-events-auto rounded-md border-2 transition',
            tag.personId ? 'border-emerald-400/90 bg-emerald-400/10' : 'border-amber-300/90 bg-amber-300/10',
            selectedTagId === tag.id && 'ring-2 ring-white shadow-lg',
          )}
          onClick={(e) => {
            e.stopPropagation();
            onSelectTag(tag.id);
          }}
          aria-label={tag.label ?? tag.person?.givenName ?? 'Face'}
        />
      ))}
      {draftBox ? (
        <PercentBox
          x={draftBox.x}
          y={draftBox.y}
          width={draftBox.width}
          height={draftBox.height}
          className="rounded-md border-2 border-dashed border-sky-400 bg-sky-400/10"
        />
      ) : null}
    </div>
  );
}
