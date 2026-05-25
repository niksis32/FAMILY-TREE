import type { TreeViewDataResponse, TreeViewEdge } from '@family/shared';
import { filterParentChildEdges, filterSpouseEdges } from '../graph/three-graph';

export interface ThreeNodePosition {
  personId: string;
  x: number;
  y: number;
  z: number;
  generation: number;
  isLiving: boolean;
}

export interface ThreeEdgeSegment {
  id: string;
  sourceId: string;
  targetId: string;
  type: 'parent-child' | 'spouse';
  start: [number, number, number];
  end: [number, number, number];
}

export interface ThreeGenerationLayer {
  generation: number;
  y: number;
  label: string;
  personIds: string[];
}

export interface ThreeLayoutResult {
  nodes: ThreeNodePosition[];
  edges: ThreeEdgeSegment[];
  layers: ThreeGenerationLayer[];
  bounds: { minX: number; maxX: number; minY: number; maxY: number; minZ: number; maxZ: number };
}

const LEVEL_HEIGHT = 2.4;
const SPOUSE_SPREAD = 1.9;
const ROW_SPACING = 4.2;

export function buildThreeLayout(data: TreeViewDataResponse): ThreeLayoutResult {
  const byGeneration = new Map<number, typeof data.nodes>();

  for (const node of data.nodes) {
    const list = byGeneration.get(node.generation) ?? [];
    list.push(node);
    byGeneration.set(node.generation, list);
  }

  const positions: ThreeNodePosition[] = [];
  const posMap = new Map<string, [number, number, number]>();

  for (const [generation, nodes] of byGeneration) {
    const y = -generation * LEVEL_HEIGHT;
    const groups = new Map<string, typeof nodes>();
    const singles: typeof nodes = [];

    for (const node of nodes) {
      if (node.spouseGroupId) {
        const g = groups.get(node.spouseGroupId) ?? [];
        g.push(node);
        groups.set(node.spouseGroupId, g);
      } else {
        singles.push(node);
      }
    }

    let rowIndex = 0;
    const placeGroup = (group: typeof nodes) => {
      const width = (group.length - 1) * SPOUSE_SPREAD;
      group.forEach((node, index) => {
        const x = rowIndex * ROW_SPACING + index * SPOUSE_SPREAD - width / 2;
        const z = generation * 0.55;
        positions.push({
          personId: node.personId,
          x,
          y,
          z,
          generation: node.generation,
          isLiving: node.isLiving,
        });
        posMap.set(node.personId, [x, y, z]);
      });
      rowIndex += 1;
    };

    for (const group of groups.values()) {
      placeGroup(group);
    }
    for (const node of singles) {
      placeGroup([node]);
    }
  }

  const edges: ThreeEdgeSegment[] = [];
  const addEdge = (edge: TreeViewEdge, kind: 'parent-child' | 'spouse') => {
    const start = posMap.get(edge.source);
    const end = posMap.get(edge.target);
    if (!start || !end) return;
    edges.push({
      id: edge.id,
      sourceId: edge.source,
      targetId: edge.target,
      type: kind,
      start,
      end,
    });
  };

  for (const edge of filterParentChildEdges(data.edges)) {
    addEdge(edge, 'parent-child');
  }
  for (const edge of filterSpouseEdges(data.edges)) {
    addEdge(edge, 'spouse');
  }

  const layers: ThreeGenerationLayer[] = (data.generations.length > 0
    ? data.generations
    : [...byGeneration.keys()].map((g) => ({
        generation: g,
        label: `Gen ${g}`,
        personIds: byGeneration.get(g)?.map((n) => n.personId) ?? [],
      }))
  ).map((band) => ({
    generation: band.generation,
    y: -band.generation * LEVEL_HEIGHT,
    label: band.label,
    personIds: band.personIds,
  }));

  let minX = 0;
  let maxX = 0;
  let minY = 0;
  let maxY = 0;
  let minZ = 0;
  let maxZ = 0;

  if (positions.length > 0) {
    minX = maxX = positions[0].x;
    minY = maxY = positions[0].y;
    minZ = maxZ = positions[0].z;
    for (const p of positions) {
      minX = Math.min(minX, p.x);
      maxX = Math.max(maxX, p.x);
      minY = Math.min(minY, p.y);
      maxY = Math.max(maxY, p.y);
      minZ = Math.min(minZ, p.z);
      maxZ = Math.max(maxZ, p.z);
    }
  }

  return {
    nodes: positions,
    edges,
    layers,
    bounds: { minX, maxX, minY, maxY, minZ, maxZ },
  };
}

/** @deprecated Use buildThreeLayout — returns node positions only */
export function buildThreeLayoutNodes(data: TreeViewDataResponse): ThreeNodePosition[] {
  return buildThreeLayout(data).nodes;
}
