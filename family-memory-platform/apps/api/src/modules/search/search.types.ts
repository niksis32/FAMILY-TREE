export type SearchCategory = 'people' | 'documents' | 'places' | 'sources';

export interface SearchDocument {
  id: string;
  category: SearchCategory;
  title: string;
  text?: string;
  entityId: string;
  year?: number;
  tags?: string[];
  /** Workspace scope for people, documents, sources */
  workspaceId?: string;
  /** Lowercase: public | family | private (people, documents) */
  privacyLevel?: string;
  isLiving?: boolean;
}

export interface CategorizedSearchResults {
  q: string;
  people: SearchDocument[];
  documents: SearchDocument[];
  places: SearchDocument[];
  sources: SearchDocument[];
}
