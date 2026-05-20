export type TreeViewMode = 'ancestors' | 'descendants' | 'full';

export interface TreePersonNode {
  id: string;
  personId: string;
  label: string;
  givenName: string;
  familyName?: string | null;
  birthDate?: string | null;
  deathDate?: string | null;
  isLiving?: boolean;
  generation: number;
}

export interface TreeRelationshipEdge {
  id: string;
  source: string;
  target: string;
  type: string;
  label: string;
}

export interface TreeGraphResponse {
  rootPersonId: string;
  mode: TreeViewMode;
  nodes: TreePersonNode[];
  edges: TreeRelationshipEdge[];
}
