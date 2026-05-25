import type { TreeViewDataResponse } from '@family/shared';

export interface CytoscapeElement {
  data: {
    id: string;
    label?: string;
    source?: string;
    target?: string;
  };
}

export function buildCytoscapeElements(data: TreeViewDataResponse): CytoscapeElement[] {
  const nodes: CytoscapeElement[] = data.nodes.map((node) => ({
    data: {
      id: node.personId,
      label: node.label,
    },
  }));

  const edges: CytoscapeElement[] = data.edges.map((edge) => ({
    data: {
      id: edge.id,
      source: edge.source,
      target: edge.target,
      label: edge.label,
    },
  }));

  return [...nodes, ...edges];
}
