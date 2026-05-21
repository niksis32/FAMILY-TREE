'use client';

import { useState } from 'react';
import { TimelineAdminWorkspace } from '@/components/timeline-admin-workspace';
import { TimelineView } from '@/components/timeline-view';
import { PageHeader } from '@/components/ui';

export function TimelinePageContent() {
  const [activePersonId, setActivePersonId] = useState('');

  return (
    <div className="space-y-8">
      <PageHeader
        title="Хронология жизни"
        description="Выберите персону — отобразятся события её жизни: рождение, брак, миграция, образование, служба, работа и другие."
      />
      <TimelineView onActivePersonChange={setActivePersonId} />
      <TimelineAdminWorkspace activePersonId={activePersonId} />
    </div>
  );
}
