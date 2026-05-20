import { TimelineAdminWorkspace } from '@/components/timeline-admin-workspace';
import { TimelineView } from '@/components/timeline-view';
import { PageHeader } from '@/components/ui';

export default function TimelinePage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Timeline"
        description="Хронология жизни человека: birth, death, marriage, migration, education, military, work и custom events с готовностью к будущему AI summary."
      />
      <TimelineView />
      <TimelineAdminWorkspace />
    </div>
  );
}
