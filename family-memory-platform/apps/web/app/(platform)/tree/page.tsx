import { TreeExplorer } from '@/components/tree-explorer';
import { Card, PageHeader } from '@/components/ui';

export default function TreePage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Семейное древо"
        description="Выберите фамилию и основную персону — дерево перестроится от неё. Справа: все с этой фамилией и участники на выбранном режиме (предки / потомки / полное)."
      />
      <TreeExplorer />
      <Card>
        <h2 className="text-xl font-semibold">Renderer architecture</h2>
        <p className="mt-3 text-sm leading-6 text-stone-600 dark:text-slate-300">
          `TreeExplorer` работает с API graph contract, а `TreeCanvas` передаёт nodes/edges в renderer adapter. Позже можно заменить React Flow на D3.js или Cytoscape.js без переписывания backend endpoints.
        </p>
      </Card>
    </div>
  );
}
