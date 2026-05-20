export type TimelineEventType =
  | 'birth'
  | 'death'
  | 'marriage'
  | 'migration'
  | 'education'
  | 'military'
  | 'work'
  | 'custom';

export interface TimelineRelatedAsset {
  id: string;
  title: string;
  type: 'document' | 'media';
  mimeType?: string;
}

export interface TimelineEntry {
  id: string;
  type: TimelineEventType;
  title: string;
  description?: string | null;
  dateFrom?: string | null;
  dateTo?: string | null;
  sortDate: string;
  place?: string | null;
  relatedDocuments: TimelineRelatedAsset[];
  relatedMedia: TimelineRelatedAsset[];
  aiSummaryInput: {
    personId: string;
    eventType: TimelineEventType;
    text: string;
  };
}

export interface PersonTimelineResponse {
  personId: string;
  personName: string;
  events: TimelineEntry[];
  availableTypes: TimelineEventType[];
}
