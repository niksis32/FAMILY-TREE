'use client';

import type { TreeViewDataResponse, TreeViewNode } from '@family/shared';
import { Html } from '@react-three/drei';

export function PersonHoverCard({
  node,
  data,
  position,
}: {
  node: TreeViewNode;
  data: TreeViewDataResponse;
  position: [number, number, number];
}) {
  const events = data.events.filter((e) => e.personId === node.personId).slice(0, 3);
  const years = [node.birthYear, node.deathYear].filter(Boolean).join(' — ');

  return (
    <Html position={[position[0], position[1] + 1.2, position[2]]} center distanceFactor={12} zIndexRange={[100, 0]}>
      <div className="pointer-events-none w-52 rounded-xl border border-cyan-500/30 bg-slate-950/95 px-3 py-2 shadow-xl shadow-cyan-900/20">
        <p className="text-sm font-semibold text-cyan-50">{node.label}</p>
        {years ? <p className="mt-0.5 text-xs text-slate-400">{years}</p> : null}
        {events.length > 0 ? (
          <ul className="mt-2 space-y-1 border-t border-slate-800 pt-2">
            {events.map((ev) => (
              <li key={ev.id} className="text-[10px] text-slate-300">
                <span className="text-pink-300">●</span> {ev.title}
                {ev.year ? <span className="text-slate-500"> ({ev.year})</span> : null}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </Html>
  );
}
