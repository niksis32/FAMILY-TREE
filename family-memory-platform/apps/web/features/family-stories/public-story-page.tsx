'use client';

import type { FamilyStoryTemplateId, PublicFamilyStoryPayloadDto } from '@family/shared';
import { useTranslations } from 'next-intl';
import { StoryMap } from './story-map';
import { StoryMediaGallery } from './story-media-gallery';
import { StoryTimeline } from './story-timeline';
import { cn } from '@/lib/utils';

const TEMPLATE_CLASS: Record<FamilyStoryTemplateId, string> = {
  classic: 'font-serif',
  heritage: 'bg-[#f6f1e8] text-[#2c2416]',
  journey: 'bg-gradient-to-b from-sky-50 to-white dark:from-slate-900 dark:to-slate-950',
  gallery: 'bg-stone-950 text-white',
};

export function PublicStoryPage({
  payload,
  pdfHref,
}: {
  payload: PublicFamilyStoryPayloadDto;
  pdfHref?: string;
}) {
  const t = useTranslations('familyStories');
  const templateClass = TEMPLATE_CLASS[payload.template] ?? TEMPLATE_CLASS.classic;

  return (
    <article className={cn('min-h-screen', templateClass)}>
      {payload.coverUrl ? (
        <div
          className="h-56 bg-cover bg-center md:h-72"
          style={{ backgroundImage: `url(${payload.coverUrl})` }}
        />
      ) : null}

      <div className="mx-auto max-w-4xl px-4 py-10 md:px-8">
        <header className="border-b border-amber-900/10 pb-8">
          <p className="text-xs uppercase tracking-[0.35em] text-amber-800/70">{t('publicPowered')}</p>
          <h1 className="mt-3 text-4xl font-semibold md:text-5xl">{payload.title}</h1>
          {payload.ogDescription ? (
            <p className="mt-3 text-lg text-stone-600 dark:text-slate-300">{payload.ogDescription}</p>
          ) : null}
          <p className="mt-4 text-sm text-stone-500">{t('views', { count: payload.viewCount })}</p>
          {pdfHref ? (
            <a
              href={pdfHref}
              className="mt-4 inline-flex rounded-full bg-family-primary px-5 py-2 text-sm font-medium text-white"
              download
            >
              {t('exportPdf')}
            </a>
          ) : null}
        </header>

        {payload.narrativeText ? (
          <section className="prose prose-stone mt-10 max-w-none dark:prose-invert">
            <p className="whitespace-pre-wrap text-lg leading-relaxed">{payload.narrativeText}</p>
          </section>
        ) : null}

        {payload.persons.length > 0 ? (
          <section className="mt-12">
            <h2 className="text-xl font-semibold">Persons</h2>
            <ul className="mt-4 grid gap-2 sm:grid-cols-2">
              {payload.persons.map((p) => (
                <li key={p.id} className="rounded-xl bg-white/60 px-4 py-2 dark:bg-slate-900/60">
                  {p.isHidden ? t('livingHidden') : p.displayName}
                  {p.birthYear ? (
                    <span className="ml-2 text-sm text-stone-500">
                      {p.birthYear}
                      {p.deathYear ? `–${p.deathYear}` : ''}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {payload.timeline.length > 0 ? (
          <section className="mt-12">
            <h2 className="mb-6 text-xl font-semibold">{t('timeline')}</h2>
            <StoryTimeline entries={payload.timeline} />
          </section>
        ) : null}

        {payload.map ? (
          <section className="mt-12">
            <h2 className="mb-6 text-xl font-semibold">{t('map')}</h2>
            <StoryMap payload={payload.map} />
          </section>
        ) : null}

        {payload.media.length > 0 ? (
          <section className="mt-12">
            <h2 className="mb-6 text-xl font-semibold">{t('media')}</h2>
            <StoryMediaGallery items={payload.media} />
          </section>
        ) : null}

        {payload.documents.length > 0 ? (
          <section className="mt-12">
            <h2 className="mb-6 text-xl font-semibold">{t('documents')}</h2>
            <ul className="space-y-2">
              {payload.documents.map((doc) => (
                <li key={doc.id}>
                  {doc.previewUrl ? (
                    <a
                      href={doc.previewUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-family-primary underline"
                    >
                      {doc.title}
                    </a>
                  ) : (
                    doc.title
                  )}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {payload.customBlocks.map((block) => (
          <section key={block.id} className="mt-12">
            <h2 className="text-xl font-semibold">{block.title}</h2>
            <p className="mt-3 whitespace-pre-wrap leading-relaxed">{block.markdown}</p>
          </section>
        ))}
      </div>
    </article>
  );
}
