import type { SearchCategory, SearchFilters } from '@family/shared';

export type { SearchCategory, SearchFilters };

export interface SearchDocument {
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
  familyId?: string;
  evidenceQuality?: number;
}

export interface CategorizedSearchResults {
  q: string;
  people: SearchDocument[];
  documents: SearchDocument[];
  places: SearchDocument[];
  sources: SearchDocument[];
  wiki: SearchDocument[];
  evidence: SearchDocument[];
  memories: SearchDocument[];
  burials: SearchDocument[];
}

export interface FacetedSearchResponse {
  q: string;
  filters: SearchFilters;
  facets: {
    categories: Record<string, number>;
    years: Record<string, number>;
    tags: Record<string, number>;
  };
  total: number;
  hits: SearchDocument[];
  nextCursor?: string | null;
}
