export type SearchCategory =
  | 'people'
  | 'documents'
  | 'places'
  | 'sources'
  | 'wiki'
  | 'evidence'
  | 'memories'
  | 'burials';

export type HintSource = 'MATCHING' | 'DOCUMENT' | 'PHOTO' | 'GAPS' | 'EXTERNAL_ARCHIVE';
export type HintStatus = 'OPEN' | 'ACCEPTED' | 'DISMISSED';

export interface SearchFilters {
  categories?: SearchCategory[];
  yearFrom?: number;
  yearTo?: number;
  tags?: string[];
  familyId?: string;
}

export interface SearchHit {
  id: string;
  category: SearchCategory;
  title: string;
  text?: string;
  entityId: string;
  year?: number;
  tags?: string[];
  workspaceId?: string;
  privacyLevel?: string;
  isLiving?: boolean;
}

export interface FacetedSearchResults {
  q: string;
  filters: SearchFilters;
  facets: {
    categories: Record<string, number>;
    years: Record<string, number>;
    tags: Record<string, number>;
  };
  total: number;
  hits: SearchHit[];
  nextCursor?: string | null;
}

export interface SavedSearchSummary {
  id: string;
  name: string;
  query: string;
  filters?: SearchFilters;
  createdAt: string;
  updatedAt: string;
}

export interface SearchHistorySummary {
  id: string;
  query: string;
  filters?: SearchFilters;
  resultCount?: number;
  createdAt: string;
}

export interface HintReasonSummary {
  code: string;
  label: string;
  weight: number;
  detail?: Record<string, unknown>;
}

export interface HintSummary {
  id: string;
  source: HintSource;
  status: HintStatus;
  entityType: string;
  entityId: string;
  targetEntityType?: string | null;
  targetEntityId?: string | null;
  title: string;
  summary?: string | null;
  score: number;
  reasons: HintReasonSummary[];
  createdAt: string;
  updatedAt: string;
}

export interface MergeFieldDiff {
  field: string;
  survivorValue: unknown;
  mergedValue: unknown;
  resolution: 'survivor' | 'merged' | 'combine';
}

export interface MergePreview {
  survivorId: string;
  mergedId: string;
  survivorName: string;
  mergedName: string;
  fieldDiffs: MergeFieldDiff[];
  repointCounts: {
    relationships: number;
    events: number;
    documents: number;
    media: number;
    citations: number;
    timelineItems: number;
  };
  warnings: string[];
}

export interface PersonMergeAuditSummary {
  id: string;
  survivorId: string;
  mergedId: string;
  performedBy: string;
  createdAt: string;
}

export interface CitationTemplateSummary {
  id: string;
  name: string;
  format: string;
  isDefault: boolean;
}

export interface EvidenceCitationSummary {
  id: string;
  sourceId: string;
  sourceTitle: string;
  personId?: string | null;
  eventId?: string | null;
  page?: string | null;
  detail?: string | null;
  qualityScore: number;
  formattedCitation?: string | null;
}

export interface BibliographyExport {
  format: 'text' | 'bibtex' | 'json';
  generatedAt: string;
  entries: Array<{
    citationId: string;
    sourceTitle: string;
    formatted: string;
    qualityScore: number;
  }>;
}

export interface WikiRevisionSummary {
  id: string;
  version: number;
  content: string;
  authorUserId?: string | null;
  createdAt: string;
}

export interface WikiPageSummary {
  id: string;
  slug: string;
  title: string;
  familyId?: string | null;
  latestRevision?: WikiRevisionSummary | null;
  createdAt: string;
  updatedAt: string;
}

export interface WikiLinkSummary {
  id: string;
  fromPageId: string;
  toPageId?: string | null;
  toEntityType?: string | null;
  toEntityId?: string | null;
}
