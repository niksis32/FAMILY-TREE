import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { PersonTimelineResponse, TimelineEntry, TimelineEventType, TimelineRelatedAsset } from './timeline.types';

@Injectable()
export class TimelineService {
  constructor(private readonly prisma: PrismaService) {}

  async getPersonTimeline(personId: string): Promise<PersonTimelineResponse> {
    const prisma = this.prisma as unknown as {
      person: {
        findUnique: (args: {
          where: { id: string };
          include: {
            events: { include: { place: true } };
            timelineItems: true;
            documents: true;
            media: true;
          };
        }) => Promise<PersonWithTimeline | null>;
      };
    };

    const person = await prisma.person.findUnique({
      where: { id: personId },
      include: {
        events: { include: { place: true } },
        timelineItems: true,
        documents: true,
        media: true,
      },
    });

    if (!person) {
      throw new NotFoundException('Person not found');
    }

    const relatedDocuments = person.documents.map<TimelineRelatedAsset>((document) => ({
      id: document.id,
      title: document.title,
      type: 'document',
      mimeType: document.mimeType,
    }));

    const relatedMedia = person.media.map<TimelineRelatedAsset>((media) => ({
      id: media.id,
      title: media.title ?? media.storageKey,
      type: 'media',
      mimeType: media.mimeType,
    }));

    const lifeEvents = [
      person.birthDate
        ? this.buildEntry({
            id: `${person.id}:birth`,
            personId: person.id,
            type: 'birth',
            title: 'Рождение',
            description: `Рождение ${this.personName(person)}`,
            dateFrom: person.birthDate,
            relatedDocuments,
            relatedMedia,
          })
        : null,
      person.deathDate
        ? this.buildEntry({
            id: `${person.id}:death`,
            personId: person.id,
            type: 'death',
            title: 'Смерть',
            description: `Смерть ${this.personName(person)}`,
            dateFrom: person.deathDate,
            relatedDocuments,
            relatedMedia,
          })
        : null,
    ].filter((event): event is TimelineEntry => event !== null);

    const eventEntries = person.events.map((event) =>
      this.buildEntry({
        id: event.id,
        personId: person.id,
        type: this.normalizeEventType(event.type),
        title: this.eventTitle(event.type),
        description: event.description,
        dateFrom: event.date,
        dateTo: event.dateEnd,
        place: event.place?.name ?? null,
        relatedDocuments,
        relatedMedia,
      }),
    );

    const customItems = person.timelineItems.map((item) =>
      this.buildEntry({
        id: item.id,
        personId: person.id,
        type: 'custom',
        title: item.title,
        description: item.description,
        dateFrom: item.sortDate,
        relatedDocuments,
        relatedMedia,
      }),
    );

    const events = [...lifeEvents, ...eventEntries, ...customItems].sort(
      (left, right) => Date.parse(left.sortDate) - Date.parse(right.sortDate),
    );

    return {
      personId,
      personName: this.personName(person),
      events,
      availableTypes: ['birth', 'death', 'marriage', 'migration', 'education', 'military', 'work', 'custom'],
    };
  }

  private buildEntry(input: BuildEntryInput): TimelineEntry {
    const sortDate = input.dateFrom ?? input.dateTo ?? new Date(0);
    const normalizedSortDate = this.toIso(sortDate) ?? new Date(0).toISOString();

    return {
      id: input.id,
      type: input.type,
      title: input.title,
      description: input.description,
      dateFrom: this.toIso(input.dateFrom),
      dateTo: this.toIso(input.dateTo),
      sortDate: normalizedSortDate,
      place: input.place,
      relatedDocuments: input.relatedDocuments,
      relatedMedia: input.relatedMedia,
      aiSummaryInput: {
        personId: input.personId,
        eventType: input.type,
        text: [input.title, input.description, input.place, normalizedSortDate].filter(Boolean).join('\n'),
      },
    };
  }

  private normalizeEventType(type: string): TimelineEventType {
    const normalized = type.toLowerCase();
    const allowed: TimelineEventType[] = ['birth', 'death', 'marriage', 'migration', 'education', 'military', 'work', 'custom'];
    return allowed.includes(normalized as TimelineEventType) ? (normalized as TimelineEventType) : 'custom';
  }

  private eventTitle(type: string) {
    const titles: Record<TimelineEventType, string> = {
      birth: 'Рождение',
      death: 'Смерть',
      marriage: 'Брак',
      migration: 'Переезд / миграция',
      education: 'Образование',
      military: 'Военная служба',
      work: 'Работа',
      custom: 'Событие',
    };

    return titles[this.normalizeEventType(type)];
  }

  private personName(person: Pick<PersonWithTimeline, 'givenName' | 'familyName'>) {
    return [person.givenName, person.familyName].filter(Boolean).join(' ');
  }

  private toIso(value?: Date | string | null) {
    if (!value) return null;
    if (value instanceof Date) return value.toISOString();
    return value;
  }
}

interface TimelineDocument {
  id: string;
  title: string;
  mimeType: string;
}

interface TimelineMedia {
  id: string;
  title?: string | null;
  storageKey: string;
  mimeType: string;
}

interface TimelineEventRecord {
  id: string;
  type: string;
  date?: Date | null;
  dateEnd?: Date | null;
  description?: string | null;
  place?: { name: string } | null;
}

interface TimelineItemRecord {
  id: string;
  title: string;
  description?: string | null;
  sortDate: Date;
}

interface PersonWithTimeline {
  id: string;
  givenName: string;
  familyName?: string | null;
  birthDate?: Date | null;
  deathDate?: Date | null;
  events: TimelineEventRecord[];
  timelineItems: TimelineItemRecord[];
  documents: TimelineDocument[];
  media: TimelineMedia[];
}

interface BuildEntryInput {
  id: string;
  personId: string;
  type: TimelineEventType;
  title: string;
  description?: string | null;
  dateFrom?: Date | string | null;
  dateTo?: Date | string | null;
  place?: string | null;
  relatedDocuments: TimelineRelatedAsset[];
  relatedMedia: TimelineRelatedAsset[];
}
