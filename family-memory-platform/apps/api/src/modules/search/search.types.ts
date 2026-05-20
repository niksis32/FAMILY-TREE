export type SearchCategory = 'people' | 'documents' | 'places' | 'sources';

export interface SearchDocument {
  id: string;
  category: SearchCategory;
  title: string;
  text?: string;
  entityId: string;
  year?: number;
  tags?: string[];
}

export interface CategorizedSearchResults {
  q: string;
  people: SearchDocument[];
  documents: SearchDocument[];
  places: SearchDocument[];
  sources: SearchDocument[];
}
