import { TreeCanvas, type TreeRelationship } from '@/components/tree-canvas';
import { Card, PageHeader } from '@/components/ui';
import { persons } from '@/lib/mock-data';

const relationships: TreeRelationship[] = [
  { id: 'r1', source: 'p1', target: 'p3', label: 'mother' },
  { id: 'r2', source: 'p2', target: 'p3', label: 'father' },
  { id: 'r3', source: 'p3', target: 'p4', label: 'mother' },
];

export default function TreePage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Семейное древо"
        description="Базовая визуализация на React Flow с pan, zoom и adapter-слоем под будущий Cytoscape.js или кастомный graph engine."
      />
      <TreeCanvas persons={persons} relationships={relationships} />
      <Card>
        <h2 className="text-xl font-semibold">Renderer architecture</h2>
        <p className="mt-3 text-sm leading-6 text-stone-600 dark:text-slate-300">
          `TreeCanvas` получает нормализованные persons + relationships и передаёт их в renderer adapter. Позже можно заменить React Flow на D3/Cytoscape без переписывания страниц.
        </p>
      </Card>
    </div>
  );
}
