'use client';

import { buildCytoscapeElements } from '@family/tree-experience';
import cytoscape, { type Core } from 'cytoscape';
import { useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { useTreeViewData } from './tree-view-data-context';

export default function GraphTreeView() {
  const { data, setSelectedNode } = useTreeViewData();
  const t = useTranslations('treeExperience');
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<Core | null>(null);

  useEffect(() => {
    if (!containerRef.current || !data) return;

    const elements = buildCytoscapeElements(data);
    cyRef.current?.destroy();

    const cy = cytoscape({
      container: containerRef.current,
      elements,
      style: [
        {
          selector: 'node',
          style: {
            label: 'data(label)',
            'text-valign': 'center',
            'text-halign': 'center',
            'font-size': 10,
            width: 56,
            height: 56,
            'background-color': '#1e4d3c',
            color: '#fff',
          },
        },
        {
          selector: 'node[?deceased]',
          style: { 'background-color': '#6b7280' },
        },
        {
          selector: 'edge',
          style: {
            width: 2,
            'line-color': '#94a3b8',
            'target-arrow-shape': 'triangle',
            'target-arrow-color': '#94a3b8',
            'curve-style': 'bezier',
          },
        },
      ],
      layout: { name: 'breadthfirst', directed: true, padding: 30 },
    });

    for (const node of data.nodes) {
      const el = cy.getElementById(node.personId);
      if (!node.isLiving) {
        el.data('deceased', true);
      }
    }

    cy.on('tap', 'node', (event) => {
      const personId = event.target.id();
      const person = data.nodes.find((n) => n.personId === personId);
      if (person) setSelectedNode(person);
    });

    cyRef.current = cy;

    return () => {
      cy.destroy();
      cyRef.current = null;
    };
  }, [data, setSelectedNode]);

  if (!data || data.nodes.length === 0) {
    return <p className="p-8 text-center text-sm text-stone-500">{t('empty')}</p>;
  }

  return (
    <div
      ref={containerRef}
      className="h-[min(70vh,720px)] w-full rounded-3xl border bg-stone-50/50 dark:border-slate-800 dark:bg-slate-950/50"
    />
  );
}
