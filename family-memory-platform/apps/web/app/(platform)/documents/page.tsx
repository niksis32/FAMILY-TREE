import { DocumentCard } from '@/components/domain';
import { PageHeader } from '@/components/ui';
import { documents } from '@/lib/mock-data';

export default function DocumentsPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Документы"
        description="Архивные источники, OCR pipeline, статусы проверки и связь документов с персонами, семьями и событиями."
      />
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {documents.map((document) => (
          <DocumentCard key={document.id} document={document} />
        ))}
      </div>
    </div>
  );
}
