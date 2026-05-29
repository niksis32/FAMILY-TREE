import { getTranslations } from 'next-intl/server';
import { TreeExperienceShell } from '@/features/tree-experience/tree-experience-shell';
import { PageHero } from '@family/ui';

export default async function TreePage() {
  const t = await getTranslations('pages.tree');

  return (
    <div className="space-y-8">
      <PageHero eyebrow={t('eyebrow')} title={t('title')} description={t('description')} />
      <TreeExperienceShell initialDisplayMode="classic" />
    </div>
  );
}
