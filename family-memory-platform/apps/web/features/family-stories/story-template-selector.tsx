'use client';

import type { FamilyStoryTemplateId } from '@family/shared';
import { FAMILY_STORY_TEMPLATES } from '@family/shared';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

const TEMPLATE_META: Record<FamilyStoryTemplateId, { label: string; desc: string }> = {
  classic: { label: 'Classic', desc: 'Serif narrative, timeline-first' },
  heritage: { label: 'Heritage', desc: 'Warm archive tones, document focus' },
  journey: { label: 'Journey', desc: 'Map-led migration story' },
  gallery: { label: 'Gallery', desc: 'Photo grid hero' },
};

export function StoryTemplateSelector({
  value,
  onChange,
}: {
  value: FamilyStoryTemplateId;
  onChange: (v: FamilyStoryTemplateId) => void;
}) {
  const t = useTranslations('familyStories');

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {FAMILY_STORY_TEMPLATES.map((id) => {
        const meta = TEMPLATE_META[id];
        const active = value === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            className={cn(
              'rounded-2xl border p-4 text-left transition',
              active
                ? 'border-family-primary bg-family-primary/5 shadow-md'
                : 'border-stone-200 hover:border-family-primary/40 dark:border-slate-700',
            )}
          >
            <p className="text-xs uppercase tracking-widest text-stone-400">{t('template')}</p>
            <p className="mt-1 font-semibold text-family-ink dark:text-white">{meta.label}</p>
            <p className="mt-1 text-sm text-stone-500">{meta.desc}</p>
          </button>
        );
      })}
    </div>
  );
}
