import { SearchPanel } from '@/components/search-panel';
import { PageHeader } from '@/components/ui';

export default function SearchPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Поиск"
        description="Глобальный локальный поиск через Meilisearch по людям, документам, местам и источникам. Внешние поисковые сервисы не используются."
      />
      <SearchPanel />
    </div>
  );
}
