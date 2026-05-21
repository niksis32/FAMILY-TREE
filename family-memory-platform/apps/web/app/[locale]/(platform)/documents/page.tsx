import { DocumentsWorkspace } from '@/components/documents-workspace';
import { PageHeader } from '@/components/ui';

export default function DocumentsPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Документы"
        description="Архивные источники, OCR pipeline, статусы проверки и связь документов с персонами, семьями и событиями."
      />
      <DocumentsWorkspace />
    </div>
  );
}
