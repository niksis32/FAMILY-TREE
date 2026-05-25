'use client';

import type { ThreeEdgeSegment } from '@family/tree-experience';
import { Line } from '@react-three/drei';
import { useMemo } from 'react';

export function RelationshipLine3D({
  edge,
  highlighted,
  dimmed,
}: {
  edge: ThreeEdgeSegment;
  highlighted: boolean;
  dimmed: boolean;
}) {
  const color = useMemo(() => {
    if (highlighted) return edge.type === 'spouse' ? '#c084fc' : '#38bdf8';
    return edge.type === 'spouse' ? '#7c3aed' : '#334155';
  }, [edge.type, highlighted]);

  const opacity = dimmed ? 0.12 : highlighted ? 1 : 0.55;
  const lineWidth = highlighted ? 2.5 : edge.type === 'spouse' ? 1.2 : 1.8;

  const mid: [number, number, number] = [
    (edge.start[0] + edge.end[0]) / 2,
    (edge.start[1] + edge.end[1]) / 2 + 0.4,
    (edge.start[2] + edge.end[2]) / 2,
  ];

  const points: [number, number, number][] = [edge.start, mid, edge.end];

  return (
    <Line
      points={points}
      color={color}
      lineWidth={lineWidth}
      transparent
      opacity={opacity}
    />
  );
}
