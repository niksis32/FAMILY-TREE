import { TreeExplorer } from '@/components/tree-explorer';
import { Card, PageHeader } from '@/components/ui';

export default function TreePage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Семейное древо"
        description="Интерактивное дерево: ancestors, descendants и full family graph. React Flow используется как MVP renderer с pan, zoom и кликом по человеку."
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
