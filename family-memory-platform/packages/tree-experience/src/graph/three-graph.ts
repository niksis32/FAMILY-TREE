import type { TreeViewDataResponse, TreeViewEdge, TreeViewNode } from '@family/shared';

export type ThreeHighlightMode =
  | 'none'
  | 'ancestors'
  | 'descendants'
  | 'paternal'
  | 'maternal'
  | 'focus';

const PARENT_TYPES = new Set(['parent', 'adoptive_parent', 'child', 'adoptive_child']);

function parentChildLink(edge: TreeViewEdge): { parentId: string; childId: string } | null {
  const type = edge.type.toLowerCase();
  if (type === 'parent' || type === 'adoptive_parent') {
    return { parentId: edge.source, childId: edge.target };
  }
  if (type === 'child' || type === 'adoptive_child') {
    return { parentId: edge.target, childId: edge.source };
  }
  return null;
}

function isParentChildEdge(edge: TreeViewEdge): boolean {
  return PARENT_TYPES.has(edge.type.toLowerCase());
}

function buildParentAdjacency(
  edges: TreeViewEdge[],
  nodesById: Map<string, TreeViewNode>,
  lineage: 'both' | 'paternal' | 'maternal',
  direction: 'up' | 'down',
): Map<string, string[]> {
  const adjacency = new Map<string, string[]>();

  for (const edge of edges) {
    const link = parentChildLink(edge);
    if (!link) continue;

    const parent = nodesById.get(link.parentId);
    const child = nodesById.get(link.childId);

    if (lineage === 'paternal') {
      if (direction === 'up' && parent?.gender !== 'MALE') continue;
      if (direction === 'down' && child?.gender !== 'MALE') continue;
    }
    if (lineage === 'maternal') {
      if (direction === 'up' && parent?.gender !== 'FEMALE') continue;
      if (direction === 'down' && child?.gender !== 'FEMALE') continue;
    }

    const from = direction === 'up' ? link.childId : link.parentId;
    const to = direction === 'up' ? link.parentId : link.childId;
    const list = adjacency.get(from) ?? [];
    list.push(to);
    adjacency.set(from, list);
  }

  return adjacency;
}

function collectReachable(startId: string, adjacency: Map<string, string[]>): Set<string> {
  const visited = new Set<string>();
  const queue = [startId];
  visited.add(startId);

  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const next of adjacency.get(current) ?? []) {
      if (!visited.has(next)) {
        visited.add(next);
        queue.push(next);
      }
    }
  }

  return visited;
}

export function collectAncestors(
  personId: string,
  data: TreeViewDataResponse,
  lineage: 'both' | 'paternal' | 'maternal' = 'both',
): Set<string> {
  const nodesById = new Map(data.nodes.map((n) => [n.personId, n]));
  const adjacency = buildParentAdjacency(data.edges, nodesById, lineage, 'up');
  return collectReachable(personId, adjacency);
}

export function collectDescendants(
  personId: string,
  data: TreeViewDataResponse,
  lineage: 'both' | 'paternal' | 'maternal' = 'both',
): Set<string> {
  const nodesById = new Map(data.nodes.map((n) => [n.personId, n]));
  const adjacency = buildParentAdjacency(data.edges, nodesById, lineage, 'down');
  return collectReachable(personId, adjacency);
}

export function collectPaternalLine(personId: string, data: TreeViewDataResponse): Set<string> {
  const ancestors = collectAncestors(personId, data, 'paternal');
  const descendants = collectDescendants(personId, data, 'paternal');
  return new Set([...ancestors, ...descendants]);
}

export function collectMaternalLine(personId: string, data: TreeViewDataResponse): Set<string> {
  const ancestors = collectAncestors(personId, data, 'maternal');
  const descendants = collectDescendants(personId, data, 'maternal');
  return new Set([...ancestors, ...descendants]);
}

export function resolveHighlightSet(
  mode: ThreeHighlightMode,
  anchorPersonId: string | null,
  data: TreeViewDataResponse | null,
): Set<string> {
  if (!data || !anchorPersonId || mode === 'none' || mode === 'focus') {
    return new Set();
  }
  switch (mode) {
    case 'ancestors':
      return collectAncestors(anchorPersonId, data);
    case 'descendants':
      return collectDescendants(anchorPersonId, data);
    case 'paternal':
      return collectPaternalLine(anchorPersonId, data);
    case 'maternal':
      return collectMaternalLine(anchorPersonId, data);
    default:
      return new Set();
  }
}

export function filterParentChildEdges(edges: TreeViewEdge[]): TreeViewEdge[] {
  return edges.filter(isParentChildEdge);
}

export function filterSpouseEdges(edges: TreeViewEdge[]): TreeViewEdge[] {
  return edges.filter((e) => {
    const t = e.type.toLowerCase();
    return t === 'spouse' || t === 'partner';
  });
}

export function personHasKeyEvents(personId: string, data: TreeViewDataResponse): boolean {
  return data.events.some((e) => e.personId === personId);
}
