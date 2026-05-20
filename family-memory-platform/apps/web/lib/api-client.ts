import { API_PREFIX, type LoginDto, type PersonSummary } from '@family/shared';

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

/** Turns Nest JSON error bodies into short UI text. */
export function formatApiError(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return error instanceof Error ? error.message : 'Неизвестная ошибка';
  }
  try {
    const body = JSON.parse(error.message) as { message?: string | string[] };
    const msg = body.message;
    if (Array.isArray(msg)) return msg.join(', ');
    if (typeof msg === 'string') return msg;
  } catch {
    /* plain text */
  }
  if (error.status === 401) {
    return 'Сессия истекла или токен недействителен. Нажмите «Выйти» и войдите снова.';
  }
  return error.message || `Ошибка API ${error.status}`;
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

export function apiPatch<T>(path: string, body: unknown, token?: string | null): Promise<T> {
  return apiRequest<T>(path, { method: 'PATCH', body, token });
}

export function apiDelete<T>(path: string, token?: string | null): Promise<T> {
  return apiRequest<T>(path, { method: 'DELETE', token });
}

export interface AuthSession {
  accessToken: string;
  tokenType: 'Bearer';
  user: {
    id: string;
    email: string;
    displayName: string | null;
    role: 'VIEWER' | 'EDITOR' | 'ADMIN';
  };
}

export interface RegisterFirstAdminInput extends LoginDto {
  displayName: string;
}

export interface FamilyRecord {
  id: string;
  name?: string | null;
  notes?: string | null;
  members?: unknown[];
  createdAt?: string;
}

export interface RelationshipRecord {
  id: string;
  fromPersonId: string;
  toPersonId: string;
  type: string;
  notes?: string | null;
}

export interface EventRecord {
  id: string;
  type: string;
  date?: string | null;
  dateEnd?: string | null;
  description?: string | null;
  personId?: string | null;
  familyId?: string | null;
  placeId?: string | null;
}

export interface PlaceRecord {
  id: string;
  name: string;
  country?: string | null;
  region?: string | null;
  city?: string | null;
}

export interface DocumentRecord {
  id: string;
  title: string;
  documentType: string;
  mimeType: string;
  storageKey: string;
  bucket: string;
  description?: string | null;
  personId?: string | null;
  sourceId?: string | null;
}

export interface SourceRecord {
  id: string;
  title: string;
  author?: string | null;
  publication?: string | null;
  repository?: string | null;
  url?: string | null;
  notes?: string | null;
}

export interface CitationRecord {
  id: string;
  sourceId: string;
  personId?: string | null;
  page?: string | null;
  detail?: string | null;
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
  registerFirstAdmin: (dto: RegisterFirstAdminInput) => apiPost<AuthSession>('/auth/register-first-admin', dto),
  me: (token?: string | null) => apiGet<AuthSession['user']>('/users/me', token),
  persons: {
    list: (token?: string | null) => apiGet<PersonSummary[]>('/persons', token),
    one: (id: string, token?: string | null) => apiGet<PersonSummary>(`/persons/${id}`, token),
    create: (input: unknown, token?: string | null) => apiPost<PersonSummary>('/persons', input, token),
    update: (id: string, input: unknown, token?: string | null) => apiPatch<PersonSummary>(`/persons/${id}`, input, token),
    remove: (id: string, token?: string | null) => apiDelete<PersonSummary>(`/persons/${id}`, token),
  },
  families: {
    list: (token?: string | null) => apiGet<FamilyRecord[]>('/families', token),
    create: (input: unknown, token?: string | null) => apiPost<FamilyRecord>('/families', input, token),
    remove: (id: string, token?: string | null) => apiDelete<FamilyRecord>(`/families/${id}`, token),
  },
  relationships: {
    list: (token?: string | null) => apiGet<RelationshipRecord[]>('/relationships', token),
    create: (input: unknown, token?: string | null) => apiPost<RelationshipRecord>('/relationships', input, token),
    remove: (id: string, token?: string | null) => apiDelete<RelationshipRecord>(`/relationships/${id}`, token),
  },
  events: {
    list: (token?: string | null) => apiGet<EventRecord[]>('/events', token),
    create: (input: unknown, token?: string | null) => apiPost<EventRecord>('/events', input, token),
    remove: (id: string, token?: string | null) => apiDelete<EventRecord>(`/events/${id}`, token),
  },
  places: {
    list: (token?: string | null) => apiGet<PlaceRecord[]>('/places', token),
    create: (input: unknown, token?: string | null) => apiPost<PlaceRecord>('/places', input, token),
    remove: (id: string, token?: string | null) => apiDelete<PlaceRecord>(`/places/${id}`, token),
  },
  documents: {
    list: (token?: string | null) => apiGet<DocumentRecord[]>('/documents', token),
    uploadUrl: (input: { fileName: string; mimeType: string; sizeBytes: number }, token?: string | null) =>
      apiPost<MediaUploadUrlResponse>('/documents/upload-url', input, token),
    create: (input: unknown, token?: string | null) => apiPost<DocumentRecord>('/documents', input, token),
    remove: (id: string, token?: string | null) => apiDelete<DocumentRecord>(`/documents/${id}`, token),
  },
  sources: {
    list: (token?: string | null) => apiGet<SourceRecord[]>('/sources', token),
    create: (input: unknown, token?: string | null) => apiPost<SourceRecord>('/sources', input, token),
    remove: (id: string, token?: string | null) => apiDelete<SourceRecord>(`/sources/${id}`, token),
  },
  citations: {
    list: (token?: string | null) => apiGet<CitationRecord[]>('/citations', token),
    create: (input: unknown, token?: string | null) => apiPost<CitationRecord>('/citations', input, token),
    remove: (id: string, token?: string | null) => apiDelete<CitationRecord>(`/citations/${id}`, token),
  },
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
