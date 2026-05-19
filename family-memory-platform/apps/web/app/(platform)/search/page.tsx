import { DocumentCard, PersonCard, SearchBox } from '@/components/domain';
import { PageHeader } from '@/components/ui';
import { documents, persons } from '@/lib/mock-data';

export default function SearchPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Поиск"
        description="Глобальный поиск по персонам, документам, событиям и медиа. Архитектура готова к Meilisearch через backend API."
      />
      <SearchBox />
      <div className="grid gap-6 xl:grid-cols-2">
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Найденные персоны</h2>
          {persons.slice(0, 2).map((person) => (
            <PersonCard key={person.id} person={person} />
          ))}
        </div>
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Документы</h2>
          {documents.slice(0, 2).map((document) => (
            <DocumentCard key={document.id} document={document} />
          ))}
        </div>
      </div>
    </div>
  );
}
