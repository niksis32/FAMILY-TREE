'use client';

import { Background, Controls, Handle, MiniMap, Position, ReactFlow, type Edge, type Node, type NodeProps } from '@xyflow/react';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import type { TreeGraphResponse, TreePersonNode, TreeRelationshipEdge } from '@/lib/api-client';

export type { TreeRelationshipEdge as TreeRelationship };

interface TreeRendererProps {
  nodes: Node[];
  edges: Edge[];
  onPersonClick?: (person: TreePersonNode) => void;
}

interface TreeRendererAdapter {
  render: (props: TreeRendererProps) => ReactNode;
}

const nodeTypes = {
  person: PersonNode,
};

const reactFlowRenderer: TreeRendererAdapter = {
  render: ({ nodes, edges, onPersonClick }) => (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      fitView
      nodesDraggable={false}
      onNodeClick={(_, node) => onPersonClick?.(node.data.person as TreePersonNode)}
    >
      <MiniMap pannable zoomable />
      <Controls />
      <Background gap={24} size={1} />
    </ReactFlow>
  ),
};

type RelationshipBadgeKey =
  | 'parent'
  | 'child'
  | 'spouse'
  | 'sibling'
  | 'partner'
  | 'adoptive_parent'
  | 'adoptive_child';

function relationshipTypeKey(type: string): RelationshipBadgeKey | null {
  const key = type.toLowerCase().replace(/-/g, '_');
  const allowed: RelationshipBadgeKey[] = [
    'parent',
    'child',
    'spouse',
    'sibling',
    'partner',
    'adoptive_parent',
    'adoptive_child',
  ];
  return allowed.includes(key as RelationshipBadgeKey) ? (key as RelationshipBadgeKey) : null;
}

function buildGraph(graph: TreeGraphResponse, edgeLabel: (type: string) => string) {
  const grouped = new Map<number, TreePersonNode[]>();

  for (const person of graph.nodes) {
    const persons = grouped.get(person.generation) ?? [];
    persons.push(person);
    grouped.set(person.generation, persons);
  }

  const nodes: Node[] = graph.nodes.map((person) => {
    const generationItems = grouped.get(person.generation) ?? [];
    const indexInGeneration = generationItems.findIndex((item) => item.id === person.id);
    const generationOffset = person.generation * 260;
    const rowOffset = (indexInGeneration - (generationItems.length - 1) / 2) * 240;

    return {
      id: person.id,
      position: {
        x: rowOffset,
        y: generationOffset,
      },
      data: {
        label: person.label,
        person,
      },
      type: 'person',
    };
  });

  const edges: Edge[] = graph.edges.map((relationship) => ({
    id: relationship.id,
    source: relationship.source,
    target: relationship.target,
    label: edgeLabel(relationship.type),
    animated: relationship.type === 'parent' || relationship.type === 'child',
    style: { stroke: '#c9a227', strokeWidth: 2 },
    labelStyle: { fill: '#78610f', fontWeight: 600 },
  }));

  return { nodes, edges };
}

function PersonNode({ data }: NodeProps<Node<{ person: TreePersonNode; label: string }>>) {
  const t = useTranslations('treeCanvas');
  const person = data.person;
  const years = [person.birthDate?.slice(0, 4) ?? '?', person.deathDate?.slice(0, 4)].filter(Boolean).join(' - ');

  return (
    <div className="min-w-48 rounded-2xl border bg-white p-4 shadow-lg transition hover:-translate-y-1 hover:shadow-premium dark:bg-slate-900">
      <Handle type="target" position={Position.Top} className="!bg-family-accent" />
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-family-primary text-sm font-semibold text-white dark:bg-family-accent dark:text-slate-950">
          {person.givenName.slice(0, 1)}
        </div>
        <div>
          <p className="font-semibold text-family-ink dark:text-white">{person.label}</p>
          <p className="text-xs text-stone-500 dark:text-slate-400">{years}</p>
        </div>
      </div>
      <p className="mt-3 text-xs text-stone-500 dark:text-slate-400">
        {person.isLiving ? t('livingRelative') : t('archiveRecord')} ·{' '}
        {t('generation', { gen: person.generation })}
      </p>
      <Handle type="source" position={Position.Bottom} className="!bg-family-accent" />
    </div>
  );
}

function legacyGraph(persons: Array<{ id: string; givenName: string; familyName?: string | null; birthDate?: string | null; deathDate?: string | null }>, relationships: TreeRelationshipEdge[]): TreeGraphResponse {
  return {
    rootPersonId: persons[0]?.id ?? '',
    mode: 'full',
    nodes: persons.map((person) => ({
      id: person.id,
      personId: person.id,
      label: `${person.givenName} ${person.familyName ?? ''}`.trim(),
      givenName: person.givenName,
      familyName: person.familyName,
      birthDate: person.birthDate,
      deathDate: person.deathDate,
      generation: 0,
    })),
    edges: relationships,
  };
}

export function TreeCanvas({
  graph,
  persons,
  relationships,
  onPersonClick,
  renderer = reactFlowRenderer,
}: {
  graph?: TreeGraphResponse;
  persons?: Array<{ id: string; givenName: string; familyName?: string | null; birthDate?: string | null; deathDate?: string | null }>;
  relationships?: TreeRelationshipEdge[];
  onPersonClick?: (person: TreePersonNode) => void;
  renderer?: TreeRendererAdapter;
}) {
  const tEdge = useTranslations('relationshipBadge');
  const edgeLabel = (type: string) => {
    const key = relationshipTypeKey(type);
    return key ? tEdge(key) : type;
  };
  const normalizedGraph = graph ?? legacyGraph(persons ?? [], relationships ?? []);
  const flowGraph = buildGraph(normalizedGraph, edgeLabel);

  return (
    <div className="h-[680px] overflow-hidden rounded-3xl border bg-white shadow-premium dark:bg-slate-950">
      {renderer.render({ ...flowGraph, onPersonClick })}
    </div>
  );
}
