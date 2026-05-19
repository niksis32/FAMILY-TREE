import { TimelineView } from '@/components/domain';
import { PageHeader } from '@/components/ui';
import { timelineEvents } from '@/lib/mock-data';

export default function TimelinePage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Timeline"
        description="Хронология жизни семьи: рождения, переезды, браки, документы, медиа-воспоминания и будущие AI-события."
      />
      <TimelineView events={timelineEvents} />
    </div>
  );
}
