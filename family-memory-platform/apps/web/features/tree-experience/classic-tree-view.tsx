'use client';

import {
  Background,
  Controls,
  Handle,
  MiniMap,
  Position,
  ReactFlow,
  type Edge,
  type Node,
  type NodeProps,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { buildClassicLayout } from '@family/tree-experience';
import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import type { TreeViewNode } from '@family/shared';
import { useTreeViewData } from './tree-view-data-context';

function PersonNode({ data }: NodeProps) {
  const person = data.person as {
    label: string;
    isLiving: boolean;
    generation: number;
  };

  return (
    <div
      className={`min-w-[140px] rounded-2xl border-2 px-3 py-2 shadow-md ${
        person.isLiving
          ? 'border-emerald-400/60 bg-white dark:bg-slate-900'
          : 'border-stone-400/50 bg-stone-100/90 opacity-85 dark:bg-stone-900/80'
      }`}
    >
      <Handle type="target" position={Position.Top} className="!bg-family-primary" />
      <p className="text-sm font-semibold leading-tight">{person.label}</p>
      <p className="mt-1 text-[10px] text-stone-500">gen {person.generation}</p>
      <Handle type="source" position={Position.Bottom} className="!bg-family-primary" />
    </div>
  );
}

const nodeTypes = { person: PersonNode };

export function ClassicTreeView() {
  const { data, setSelectedNode } = useTreeViewData();
  const t = useTranslations('treeExperience');

  const { nodes, edges } = useMemo(() => {
    if (!data) {
      return { nodes: [] as Node[], edges: [] as Edge[] };
    }

    const layout = buildClassicLayout(data);
    const positionById = new Map(layout.map((item) => [item.personId, item]));

    const flowNodes: Node[] = data.nodes.map((node) => {
      const pos = positionById.get(node.personId) ?? { x: 0, y: 0 };
      return {
        id: node.personId,
        type: 'person',
        position: { x: pos.x, y: pos.y },
        data: { person: node },
      };
    });

    const flowEdges: Edge[] = data.edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      label: edge.label,
      animated: edge.type.toLowerCase() === 'spouse',
    }));

    return { nodes: flowNodes, edges: flowEdges };
  }, [data]);

  if (!data || nodes.length === 0) {
    return <p className="p-8 text-center text-sm text-stone-500">{t('empty')}</p>;
  }

  return (
    <div className="h-[min(70vh,720px)] w-full rounded-3xl border bg-stone-50/50 dark:border-slate-800 dark:bg-slate-950/50">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        nodesDraggable={false}
        onNodeClick={(_, node) => setSelectedNode(node.data.person as TreeViewNode)}
      >
        <MiniMap pannable zoomable />
        <Controls />
        <Background gap={24} size={1} />
      </ReactFlow>
    </div>
  );
}
