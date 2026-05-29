import { getTranslations } from 'next-intl/server';
import { TreeExperienceShell } from '@/features/tree-experience/tree-experience-shell';
import { PageHero } from '@family/ui';

export default async function Tree3dPage() {
  const t = await getTranslations('pages.tree3d');

  return (
    <div className="space-y-8">
      <PageHero eyebrow={t('eyebrow')} title={t('title')} description={t('description')} />
      <TreeExperienceShell initialDisplayMode="three-d" />
    </div>
  );
}
