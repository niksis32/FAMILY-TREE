import type { TreePersonNode } from './person.model';

/**
 * Tree graph structure for D3/Cytoscape renderers.
 * Iteration: layout algorithms (Reingold-Tilford), union nodes for families.
 */
export interface TreeEdge {
  id: string;
  sourceId: string;
  targetId: string;
  relationshipType: string;
}

export interface TreeGraph {
  nodes: TreePersonNode[];
  edges: TreeEdge[];
  rootPersonId?: string;
}

/** Placeholder: assemble graph from flat person + relationship lists */
export function buildTreeGraph(
  nodes: TreePersonNode[],
  edges: TreeEdge[],
  rootPersonId?: string,
): TreeGraph {
  return { nodes, edges, rootPersonId };
}
