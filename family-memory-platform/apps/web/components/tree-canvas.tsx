'use client';

import { Background, Controls, MiniMap, ReactFlow, type Edge, type Node } from '@xyflow/react';
import type { PersonSummary } from '@family/shared';
import type { ReactNode } from 'react';

export interface TreeRelationship {
  id: string;
  source: string;
  target: string;
  label: string;
}

interface TreeRendererProps {
  nodes: Node[];
  edges: Edge[];
}

interface TreeRendererAdapter {
  render: (props: TreeRendererProps) => ReactNode;
}

const reactFlowRenderer: TreeRendererAdapter = {
  render: ({ nodes, edges }) => (
    <ReactFlow nodes={nodes} edges={edges} fitView nodesDraggable={false}>
      <MiniMap pannable zoomable />
      <Controls />
      <Background gap={24} size={1} />
    </ReactFlow>
  ),
};

function buildGraph(persons: PersonSummary[], relationships: TreeRelationship[]) {
  const nodes: Node[] = persons.map((person, index) => ({
    id: person.id,
    position: {
      x: (index % 2) * 280,
      y: Math.floor(index / 2) * 160,
    },
    data: {
      label: `${person.givenName} ${person.familyName ?? ''}`.trim(),
    },
    type: 'default',
  }));

  const edges: Edge[] = relationships.map((relationship) => ({
    id: relationship.id,
    source: relationship.source,
    target: relationship.target,
    label: relationship.label,
    animated: true,
    style: { stroke: '#c9a227', strokeWidth: 2 },
  }));

  return { nodes, edges };
}

export function TreeCanvas({
  persons,
  relationships,
  renderer = reactFlowRenderer,
}: {
  persons: PersonSummary[];
  relationships: TreeRelationship[];
  renderer?: TreeRendererAdapter;
}) {
  const graph = buildGraph(persons, relationships);

  return (
    <div className="h-[620px] overflow-hidden rounded-3xl border bg-white shadow-premium dark:bg-slate-950">
      {renderer.render(graph)}
    </div>
  );
}
