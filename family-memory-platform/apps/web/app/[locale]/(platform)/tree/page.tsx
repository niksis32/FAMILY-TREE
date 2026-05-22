import { getTranslations } from 'next-intl/server';
import { TreeExplorer } from '@/components/tree-explorer';
import { PageHeader } from '@/components/ui';

export default async function TreePage() {
  const t = await getTranslations('pages.tree');

  return (
    <div className="space-y-8">
      <PageHeader title={t('title')} description={t('description')} />
      <TreeExplorer />
      <section className="rounded-3xl border bg-white/85 p-6 shadow-premium dark:bg-slate-900/80">
        <h2 className="text-xl font-semibold">{t('rendererTitle')}</h2>
        <p className="mt-3 text-sm leading-6 text-stone-600 dark:text-slate-300">{t('rendererNote')}</p>
      </section>
    </div>
  );
}
