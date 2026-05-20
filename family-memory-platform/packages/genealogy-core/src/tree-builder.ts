import type { Relationship, TreePersonNode } from './person.model';
import { getParentChildDirection } from './relationship.rules';

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

export interface RelationshipTreeNode {
  personId: string;
  generation: number;
  relationshipId?: string;
  children: RelationshipTreeNode[];
}

export interface RelationshipTree {
  rootPersonId: string;
  direction: 'ancestors' | 'descendants';
  nodes: RelationshipTreeNode;
}

export function buildTreeGraph(
  nodes: TreePersonNode[],
  edges: TreeEdge[],
  rootPersonId?: string,
): TreeGraph {
  return { nodes, edges, rootPersonId };
}

export function buildAncestorTree(personId: string, relationships: Relationship[]): RelationshipTree {
  const parentMap = new Map<string, Array<{ personId: string; relationshipId: string }>>();

  for (const relationship of relationships) {
    const direction = getParentChildDirection(relationship);
    if (!direction) {
      continue;
    }

    const parents = parentMap.get(direction.childId) ?? [];
    parents.push({ personId: direction.parentId, relationshipId: relationship.id });
    parentMap.set(direction.childId, parents);
  }

  return {
    rootPersonId: personId,
    direction: 'ancestors',
    nodes: buildDirectionalNode(personId, parentMap, 0, new Set()),
  };
}

export function buildDescendantTree(personId: string, relationships: Relationship[]): RelationshipTree {
  const childMap = new Map<string, Array<{ personId: string; relationshipId: string }>>();

  for (const relationship of relationships) {
    const direction = getParentChildDirection(relationship);
    if (!direction) {
      continue;
    }

    const children = childMap.get(direction.parentId) ?? [];
    children.push({ personId: direction.childId, relationshipId: relationship.id });
    childMap.set(direction.parentId, children);
  }

  return {
    rootPersonId: personId,
    direction: 'descendants',
    nodes: buildDirectionalNode(personId, childMap, 0, new Set()),
  };
}

function buildDirectionalNode(
  personId: string,
  adjacency: Map<string, Array<{ personId: string; relationshipId: string }>>,
  generation: number,
  path: Set<string>,
): RelationshipTreeNode {
  if (path.has(personId)) {
    return { personId, generation, children: [] };
  }

  const nextPath = new Set(path);
  nextPath.add(personId);

  return {
    personId,
    generation,
    children: (adjacency.get(personId) ?? []).map((relation) => ({
      ...buildDirectionalNode(relation.personId, adjacency, generation + 1, nextPath),
      relationshipId: relation.relationshipId,
    })),
  };
}
