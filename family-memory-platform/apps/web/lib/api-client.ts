import { API_PREFIX, type LoginDto, type PaginatedResponse, type PersonSummary } from '@family/shared';

/**
 * Thin API client for NestJS. It already carries auth/error semantics, while
 * backend CRUD can be connected incrementally without changing page code.
 */
const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? `http://localhost:4000${API_PREFIX}`;

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly path: string,
    message?: string,
  ) {
    super(message ?? `API ${status}: ${path}`);
    this.name = 'ApiError';
  }
}

type ApiRequestOptions = Omit<RequestInit, 'body'> & {
  token?: string | null;
  body?: unknown;
};

async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const { token, body, headers, ...init } = options;
  const res = await fetch(`${baseUrl}${path}`, {
    cache: 'no-store',
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (!res.ok) {
    const message = await res.text().catch(() => '');
    throw new ApiError(res.status, path, message || undefined);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return res.json() as Promise<T>;
}

export function apiGet<T>(path: string, token?: string | null): Promise<T> {
  return apiRequest<T>(path, { token });
}

export function apiPost<T>(path: string, body: unknown, token?: string | null): Promise<T> {
  return apiRequest<T>(path, { method: 'POST', body, token });
}

export interface AuthSession {
  accessToken: string;
  user: {
    id: string;
    email: string;
    displayName: string;
  };
}

export interface MediaUploadUrlResponse {
  bucket: string;
  storageKey: string;
  uploadUrl: string;
  expiresInSeconds: number;
}

export interface MediaMetadataInput {
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  storageKey: string;
  title?: string;
  personId?: string;
}

export interface SearchResultItem {
  id: string;
  category: 'people' | 'documents' | 'places' | 'sources';
  title: string;
  text?: string;
  entityId: string;
  year?: number;
  tags?: string[];
}

export interface SearchResults {
  q: string;
  people: SearchResultItem[];
  documents: SearchResultItem[];
  places: SearchResultItem[];
  sources: SearchResultItem[];
}

export interface GedcomPreview {
  fileName?: string;
  personsFound: number;
  familiesFound: number;
  relationshipsFound: number;
  eventsFound: number;
  sourcesFound: number;
  errors: string[];
  warnings: string[];
  imported?: boolean;
}

export type TreeViewMode = 'ancestors' | 'descendants' | 'full';

export interface TreePersonNode {
  id: string;
  personId: string;
  label: string;
  givenName: string;
  familyName?: string | null;
  birthDate?: string | null;
  deathDate?: string | null;
  isLiving?: boolean;
  generation: number;
}

export interface TreeRelationshipEdge {
  id: string;
  source: string;
  target: string;
  type: string;
  label: string;
}

export interface TreeGraphResponse {
  rootPersonId: string;
  mode: TreeViewMode;
  nodes: TreePersonNode[];
  edges: TreeRelationshipEdge[];
}

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

export const apiClient = {
  login: (dto: LoginDto) => apiPost<AuthSession>('/auth/login', dto),
  persons: (token?: string | null) => apiGet<PaginatedResponse<PersonSummary>>('/persons', token),
  media: {
    list: (token?: string | null) => apiGet<unknown[]>('/media', token),
    uploadUrl: (input: { fileName: string; mimeType: string; sizeBytes: number }, token?: string | null) =>
      apiPost<MediaUploadUrlResponse>('/media/upload-url', input, token),
    metadata: (input: MediaMetadataInput, token?: string | null) => apiPost('/media/metadata', input, token),
  },
  search: (q: string, token?: string | null) => apiGet<SearchResults>(`/search?q=${encodeURIComponent(q)}`, token),
  gedcom: {
    preview: (gedcomText: string, fileName?: string, token?: string | null) =>
      apiPost<GedcomPreview>('/gedcom/preview', { gedcomText, fileName }, token),
    import: (gedcomText: string, fileName?: string, token?: string | null) =>
      apiPost<GedcomPreview>('/gedcom/import', { gedcomText, fileName }, token),
  },
  tree: {
    graph: (personId: string, mode: TreeViewMode, token?: string | null) =>
      apiGet<TreeGraphResponse>(`/tree/person/${personId}/${mode}`, token),
  },
  timeline: {
    person: (personId: string, token?: string | null) =>
      apiGet<PersonTimelineResponse>(`/timeline/person/${personId}`, token),
  },
};
