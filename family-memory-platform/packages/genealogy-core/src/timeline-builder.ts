import type { Person, TimelineEvent, TimelineItem } from './person.model';

export function buildTimeline(person: Person, events: TimelineEvent[]): TimelineItem[] {
  const lifecycleEvents: TimelineEvent[] = [];

  if (person.birthDate) {
    lifecycleEvents.push({
      id: `${person.id}:birth`,
      personId: person.id,
      type: 'birth',
      title: 'Birth',
      date: person.birthDate,
    });
  }

  if (person.deathDate) {
    lifecycleEvents.push({
      id: `${person.id}:death`,
      personId: person.id,
      type: 'death',
      title: 'Death',
      date: person.deathDate,
    });
  }

  return [...lifecycleEvents, ...events]
    .filter((event) => !event.personId || event.personId === person.id)
    .map(toTimelineItem)
    .sort((left, right) => left.sortKey - right.sortKey || left.title.localeCompare(right.title));
}

function toTimelineItem(event: TimelineEvent): TimelineItem {
  const year = getYear(event.date);

  return {
    ...event,
    year: year ?? undefined,
    sortKey: getSortKey(event.date),
  };
}

function getYear(value?: string | Date | null): number | null {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.getUTCFullYear();
  }

  const match = value.match(/\d{4}/);
  return match ? Number(match[0]) : null;
}

function getSortKey(value?: string | Date | null): number {
  if (!value) {
    return Number.MAX_SAFE_INTEGER;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? Number.MAX_SAFE_INTEGER : value.getTime();
  }

  const parsed = Date.parse(value);
  if (!Number.isNaN(parsed)) {
    return parsed;
  }

  const year = getYear(value);
  return year ? Date.UTC(year, 0, 1) : Number.MAX_SAFE_INTEGER;
}
