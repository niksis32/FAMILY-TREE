'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/components/auth-provider';
import { TreeCanvas } from '@/components/tree-canvas';
import { Badge, Button, Card, Input } from '@/components/ui';
import { apiClient, type TreeGraphResponse, type TreePersonNode, type TreeViewMode } from '@/lib/api-client';
import { persons } from '@/lib/mock-data';

const fallbackGraph: TreeGraphResponse = {
  rootPersonId: 'p3',
  mode: 'full',
  nodes: [
    ...persons.map((person, index) => ({
      id: person.id,
      personId: person.id,
      label: `${person.givenName} ${person.familyName ?? ''}`.trim(),
      givenName: person.givenName,
      familyName: person.familyName,
      birthDate: person.birthDate,
      deathDate: person.deathDate,
      isLiving: true,
      generation: index < 2 ? -1 : index === 2 ? 0 : 1,
    })),
  ],
  edges: [
    { id: 'r1', source: 'p1', target: 'p3', type: 'parent', label: 'родитель' },
    { id: 'r2', source: 'p2', target: 'p3', type: 'parent', label: 'родитель' },
    { id: 'r3', source: 'p3', target: 'p4', type: 'parent', label: 'родитель' },
  ],
};

const modes: Array<{ value: TreeViewMode; label: string }> = [
  { value: 'ancestors', label: 'Ancestors' },
  { value: 'descendants', label: 'Descendants' },
  { value: 'full', label: 'Full graph' },
];

export function TreeExplorer() {
  const { session } = useAuth();
  const [rootPersonId, setRootPersonId] = useState('p3');
  const [mode, setMode] = useState<TreeViewMode>('full');
  const [graph, setGraph] = useState<TreeGraphResponse>(fallbackGraph);
  const [selectedPerson, setSelectedPerson] = useState<TreePersonNode | null>(fallbackGraph.nodes[2] ?? null);
  const [status, setStatus] = useState('Demo graph loaded. Укажите реальный Person ID для данных из API.');

  useEffect(() => {
    let cancelled = false;

    async function loadGraph() {
      if (!rootPersonId.trim()) return;
      setStatus('Загружаем дерево из backend...');

      try {
        const nextGraph = await apiClient.tree.graph(rootPersonId.trim(), mode, session?.accessToken);
        if (cancelled) return;
        setGraph(nextGraph);
        setSelectedPerson(nextGraph.nodes.find((node) => node.id === nextGraph.rootPersonId) ?? nextGraph.nodes[0] ?? null);
        setStatus(`Загружено: ${nextGraph.nodes.length} nodes, ${nextGraph.edges.length} edges`);
      } catch (error) {
        if (cancelled) return;
        setGraph({ ...fallbackGraph, mode });
        setSelectedPerson(fallbackGraph.nodes.find((node) => node.id === fallbackGraph.rootPersonId) ?? fallbackGraph.nodes[0] ?? null);
        setStatus(error instanceof Error ? `API недоступен, показан demo graph: ${error.message}` : 'API недоступен, показан demo graph');
      }
    }

    void loadGraph();

    return () => {
      cancelled = true;
    };
  }, [mode, rootPersonId, session?.accessToken]);

  const rootLabel = useMemo(
    () => graph.nodes.find((node) => node.id === graph.rootPersonId)?.label ?? graph.rootPersonId,
    [graph],
  );

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
      <div className="space-y-4">
        <Card className="p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm text-stone-500 dark:text-slate-400">Root person</p>
              <p className="font-semibold text-family-primary dark:text-family-accent">{rootLabel}</p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                className="sm:w-72"
                value={rootPersonId}
                onChange={(event) => setRootPersonId(event.target.value)}
                placeholder="Person ID"
              />
              <div className="flex gap-2">
                {modes.map((item) => (
                  <Button
                    key={item.value}
                    type="button"
                    variant={mode === item.value ? 'primary' : 'secondary'}
                    onClick={() => setMode(item.value)}
                  >
                    {item.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>
          <p className="mt-3 text-sm text-stone-500 dark:text-slate-400">{status}</p>
        </Card>

        <TreeCanvas graph={graph} onPersonClick={setSelectedPerson} />
      </div>

      <PersonDetailsPanel person={selectedPerson} mode={mode} />
    </div>
  );
}

function PersonDetailsPanel({ person, mode }: { person: TreePersonNode | null; mode: TreeViewMode }) {
  if (!person) {
    return (
      <Card>
        <h2 className="text-xl font-semibold">PersonDetails</h2>
        <p className="mt-3 text-sm text-stone-600 dark:text-slate-300">Кликните по карточке человека на дереве.</p>
      </Card>
    );
  }

  const years = [person.birthDate?.slice(0, 4) ?? '?', person.deathDate?.slice(0, 4)].filter(Boolean).join(' - ');

  return (
    <Card className="sticky top-28 h-fit">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-family-accent">PersonDetails</p>
          <h2 className="mt-3 text-2xl font-semibold">{person.label}</h2>
        </div>
        <Badge tone={person.isLiving ? 'green' : 'neutral'}>{person.isLiving ? 'living' : 'archive'}</Badge>
      </div>

      <div className="mt-6 space-y-4 text-sm">
        <Detail label="Person ID" value={person.personId} />
        <Detail label="Режим дерева" value={mode} />
        <Detail label="Годы" value={years} />
        <Detail label="Поколение" value={String(person.generation)} />
      </div>

      <p className="mt-6 text-sm leading-6 text-stone-600 dark:text-slate-300">
        Панель отделена от renderer-а: при замене React Flow на D3.js или Cytoscape.js контракт клика остаётся `TreePersonNode`.
      </p>
    </Card>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border bg-stone-50 p-4 dark:bg-slate-950">
      <p className="text-xs text-stone-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 font-medium">{value}</p>
    </div>
  );
}
