import type { TreeViewDataResponse } from '@family/shared';

export interface TimelineLayoutItem {
  personId: string;
  x: number;
  y: number;
  year?: number | null;
  label: string;
}

const YEAR_SCALE = 0.08;
const GENERATION_GAP = 90;

export function buildTimelineLayout(data: TreeViewDataResponse): TimelineLayoutItem[] {
  const eventsByPerson = new Map<string, number[]>();
  for (const event of data.events) {
    if (!event.personId || event.year == null) continue;
    const years = eventsByPerson.get(event.personId) ?? [];
    years.push(event.year);
    eventsByPerson.set(event.personId, years);
  }

  const minYear =
    data.events.reduce((min, event) => (event.year != null && event.year < min ? event.year : min), new Date().getFullYear()) -
    20;

  return data.nodes.map((node) => {
    const years = eventsByPerson.get(node.personId);
    const year = node.birthYear ?? years?.[0] ?? node.deathYear ?? minYear + 30;
    return {
      personId: node.personId,
      x: (year - minYear) * YEAR_SCALE * 100,
      y: node.generation * GENERATION_GAP,
      year,
      label: node.label,
    };
  });
}
