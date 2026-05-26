'use client';

import type { PhotoFaceTagRecord } from '@family/shared';
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
        <button
          key={tag.id}
          type="button"
          className={cn(
            'pointer-events-auto absolute rounded-md border-2 transition',
            tag.personId ? 'border-emerald-400/90 bg-emerald-400/10' : 'border-amber-300/90 bg-amber-300/10',
            selectedTagId === tag.id && 'ring-2 ring-white shadow-lg',
          )}
          style={{
            left: `${tag.x * 100}%`,
            top: `${tag.y * 100}%`,
            width: `${tag.width * 100}%`,
            height: `${tag.height * 100}%`,
          }}
          onClick={(e) => {
            e.stopPropagation();
            onSelectTag(tag.id);
          }}
          aria-label={tag.label ?? tag.person?.givenName ?? 'Face'}
        />
      ))}
      {draftBox ? (
        <div
          className="absolute rounded-md border-2 border-dashed border-sky-400 bg-sky-400/10"
          style={{
            left: `${draftBox.x * 100}%`,
            top: `${draftBox.y * 100}%`,
            width: `${draftBox.width * 100}%`,
            height: `${draftBox.height * 100}%`,
          }}
        />
      ) : null}
    </div>
  );
}
