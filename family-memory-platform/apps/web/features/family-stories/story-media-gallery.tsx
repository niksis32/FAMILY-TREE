'use client';

import type { PublicStoryMediaDto } from '@family/shared';

export function StoryMediaGallery({ items }: { items: PublicStoryMediaDto[] }) {
  if (!items.length) return null;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <figure
          key={item.id}
          className="overflow-hidden rounded-2xl border bg-stone-50 dark:border-slate-800 dark:bg-slate-900"
        >
          {item.url && item.mimeType?.startsWith('image/') ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.url} alt={item.title ?? ''} className="aspect-[4/3] w-full object-cover" />
          ) : (
            <div className="flex aspect-[4/3] items-center justify-center text-sm text-stone-400">Media</div>
          )}
          {item.title ? (
            <figcaption className="px-3 py-2 text-sm text-stone-600 dark:text-slate-300">{item.title}</figcaption>
          ) : null}
        </figure>
      ))}
    </div>
  );
}
