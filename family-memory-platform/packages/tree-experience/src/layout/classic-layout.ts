import type { TreeViewDataResponse, TreeViewNode } from '@family/shared';

export interface ClassicLayoutPosition {
  personId: string;
  x: number;
  y: number;
}

const GENERATION_GAP = 260;
const SPOUSE_GAP = 220;
const NODE_GAP = 120;

export function buildClassicLayout(data: TreeViewDataResponse): ClassicLayoutPosition[] {
  const byGeneration = new Map<number, TreeViewNode[]>();
  for (const node of data.nodes) {
    const list = byGeneration.get(node.generation) ?? [];
    list.push(node);
    byGeneration.set(node.generation, list);
  }

  const positions: ClassicLayoutPosition[] = [];
  const spouseOffset = new Map<string, number>();

  for (const [generation, nodes] of [...byGeneration.entries()].sort(([a], [b]) => a - b)) {
    const y = generation * GENERATION_GAP;
    const groups = groupBySpouse(nodes);
    let cursorX = 0;

    for (const group of groups) {
      const groupWidth = (group.length - 1) * SPOUSE_GAP;
      const startX = cursorX - groupWidth / 2;
      group.forEach((node, index) => {
        const x = startX + index * SPOUSE_GAP;
        positions.push({ personId: node.personId, x, y });
        if (node.spouseGroupId) {
          spouseOffset.set(node.spouseGroupId, x);
        }
      });
      cursorX += groupWidth + NODE_GAP + SPOUSE_GAP;
    }
  }

  return positions;
}

function groupBySpouse(nodes: TreeViewNode[]) {
  const groups: TreeViewNode[][] = [];
  const used = new Set<string>();

  for (const node of nodes) {
    if (used.has(node.personId)) continue;
    if (node.spouseGroupId) {
      const spouses = nodes.filter((n) => n.spouseGroupId === node.spouseGroupId);
      groups.push(spouses);
      for (const spouse of spouses) {
        used.add(spouse.personId);
      }
      continue;
    }
    groups.push([node]);
    used.add(node.personId);
  }

  return groups;
}
