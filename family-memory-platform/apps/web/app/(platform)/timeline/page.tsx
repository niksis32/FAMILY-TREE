import { TimelineAdminWorkspace } from '@/components/timeline-admin-workspace';
import { TimelineView } from '@/components/timeline-view';
import { PageHeader } from '@/components/ui';

export default function TimelinePage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Хронология жизни"
        description="Выберите персону — отобразятся события её жизни: рождение, брак, миграция, образование, служба, работа и другие."
      />
      <TimelineView />
      <TimelineAdminWorkspace />
    </div>
  );
}
