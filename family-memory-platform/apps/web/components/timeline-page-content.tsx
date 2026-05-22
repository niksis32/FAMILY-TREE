'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { TimelineAdminWorkspace } from '@/components/timeline-admin-workspace';
import { TimelineView } from '@/components/timeline-view';
import { PageHeader } from '@/components/ui';

export function TimelinePageContent() {
  const [activePersonId, setActivePersonId] = useState('');
  const t = useTranslations('timelinePage');

  return (
    <div className="space-y-8">
      <PageHeader title={t('title')} description={t('description')} />
      <TimelineView onActivePersonChange={setActivePersonId} />
      <TimelineAdminWorkspace activePersonId={activePersonId} />
    </div>
  );
}
