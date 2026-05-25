'use client';

import { buildTimelineLayout } from '@family/tree-experience';
import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useTreeViewData } from './tree-view-data-context';

export default function TimelineTreeView() {
  const { data, selectedNode, setSelectedNode } = useTreeViewData();
  const t = useTranslations('treeExperience');

  const layout = useMemo(() => (data ? buildTimelineLayout(data) : []), [data]);

  if (!data || layout.length === 0) {
    return <p className="p-8 text-center text-sm text-stone-500">{t('empty')}</p>;
  }

  const maxX = Math.max(...layout.map((i) => i.x), 400);
  const maxY = Math.max(...layout.map((i) => i.y), 200);

  return (
    <div className="h-[min(70vh,720px)] w-full overflow-auto rounded-3xl border bg-stone-50/50 p-4 dark:border-slate-800 dark:bg-slate-950/50">
      <svg width={maxX + 120} height={maxY + 120} className="min-w-full">
        <line x1={60} y1={maxY + 40} x2={maxX + 60} y2={maxY + 40} stroke="#94a3b8" strokeWidth={1} />
        {layout.map((item) => {
          const node = data.nodes.find((n) => n.personId === item.personId);
          const selected = selectedNode?.personId === item.personId;
          return (
            <g
              key={item.personId}
              transform={`translate(${item.x + 60},${item.y + 40})`}
              className="cursor-pointer"
              onClick={() => node && setSelectedNode(node)}
            >
              <rect
                x={-50}
                y={-18}
                width={100}
                height={36}
                rx={10}
                fill={node?.isLiving ? '#2d6a4f' : '#6b7280'}
                stroke={selected ? '#d4a853' : 'transparent'}
                strokeWidth={3}
              />
              <text x={0} y={4} textAnchor="middle" fill="#fff" fontSize={10}>
                {item.label.length > 14 ? `${item.label.slice(0, 12)}…` : item.label}
              </text>
              {item.year ? (
                <text x={0} y={52} textAnchor="middle" fill="#64748b" fontSize={9}>
                  {item.year}
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
