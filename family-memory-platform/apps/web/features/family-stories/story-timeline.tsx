'use client';

import type { PublicStoryTimelineEntryDto } from '@family/shared';

export function StoryTimeline({ entries }: { entries: PublicStoryTimelineEntryDto[] }) {
  if (!entries.length) return null;

  return (
    <ol className="relative border-l border-amber-200/80 pl-6 dark:border-amber-900/60">
      {entries.map((entry) => (
        <li key={entry.id} className="mb-8 last:mb-0">
          <span className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full bg-family-accent ring-4 ring-white dark:ring-slate-950" />
          {entry.date ? (
            <time className="text-xs font-medium uppercase tracking-wider text-amber-800/80 dark:text-amber-200/80">
              {entry.date.slice(0, 10)}
            </time>
          ) : null}
          <h3 className="mt-1 text-lg font-semibold text-family-ink dark:text-white">{entry.title}</h3>
          {entry.description ? (
            <p className="mt-1 text-sm leading-relaxed text-stone-600 dark:text-slate-300">{entry.description}</p>
          ) : null}
        </li>
      ))}
    </ol>
  );
}
