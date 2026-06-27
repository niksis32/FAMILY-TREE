import { type AppLocale, type LoginDto, type PersonSummary } from '@family/shared';
import { getApiBaseUrl } from '@/lib/api-base-url';

/**
 * Thin API client for NestJS. It already carries auth/error semantics, while
 * backend CRUD can be connected incrementally without changing page code.
 */

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
  let parsedMessage: string | undefined;
  try {
    const body = JSON.parse(error.message) as { message?: string | string[] };
    const msg = body.message;
    if (Array.isArray(msg)) parsedMessage = msg.join(', ');
    else if (typeof msg === 'string') parsedMessage = msg;
  } catch {
    /* plain text */
  }
  if (parsedMessage) return parsedMessage;
  if (error.status === 401) {
    return 'Сессия истекла или токен недействителен. Нажмите «Выйти» и войдите снова.';
  }
  if (error.status === 429) {
    return 'Слишком много запросов. Подождите немного и попробуйте снова.';
  }
  return error.message || `Ошибка API ${error.status}`;
}

type ApiRequestOptions = Omit<RequestInit, 'body'> & {
  token?: string | null;
  body?: unknown;
};

function appendLang(params: URLSearchParams, locale?: AppLocale | string | null) {
  if (locale) params.set('lang', locale);
}

async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const { token, body, headers, ...init } = options;
  const res = await fetch(`${getApiBaseUrl()}${path}`, {
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

export function apiPut<T>(path: string, body: unknown, token?: string | null): Promise<T> {
  return apiRequest<T>(path, { method: 'PUT', body, token });
}

export function apiDelete<T>(path: string, token?: string | null): Promise<T> {
  return apiRequest<T>(path, { method: 'DELETE', token });
}

export interface MilitaryConflictRecord {
  id: string;
  name: string;
  color: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  isCustom: boolean;
  proposerLabel?: string | null;
  createdById?: string | null;
  reviewedAt?: string | null;
  createdAt: string;
  updatedAt: string;
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

export type LoginResponse =
  | AuthSession
  | {
      mfaRequired: true;
      mfaSessionToken: string;
      methods: Array<'totp' | 'recovery' | 'passkey'>;
      user: { id: string; email: string };
    };

export interface RegisterFirstAdminInput extends LoginDto {
  displayName: string;
}

export interface FamilyMemberPersonRecord {
  id: string;
  givenName: string;
  patronymic?: string | null;
  familyName?: string | null;
  gender?: string | null;
}

export interface FamilyMemberRecord {
  id: string;
  role: string;
  person: FamilyMemberPersonRecord;
}

export interface FamilyRecord {
  id: string;
  name?: string | null;
  notes?: string | null;
  members?: FamilyMemberRecord[];
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
  latitude?: number | null;
  longitude?: number | null;
  country?: string | null;
  region?: string | null;
  city?: string | null;
  geoCountryId?: string | null;
  geoRegionId?: string | null;
  geoCityId?: string | null;
  geoCountry?: { id: string; name: string; historicalName?: string | null } | null;
  geoRegion?: { id: string; name: string } | null;
  geoCity?: { id: string; name: string; historicalName?: string | null } | null;
}

export interface GeoCountryRecord {
  id: string;
  name: string;
  historicalName?: string | null;
  iso2?: string | null;
  iso3?: string | null;
  periodFrom?: number | null;
  periodTo?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  geonamesId?: number | null;
  wikidataId?: string | null;
}

export interface GeoRegionRecord {
  id: string;
  countryId: string;
  name: string;
  periodFrom?: number | null;
  periodTo?: number | null;
}

export interface GeoCityRecord {
  id: string;
  countryId: string;
  regionId?: string | null;
  name: string;
  historicalName?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  population?: number | null;
  timezone?: string | null;
  periodFrom?: number | null;
  periodTo?: number | null;
  geonamesId?: number | null;
  wikidataId?: string | null;
  aliases?: { id: string; oldName: string; fromYear?: number | null; toYear?: number | null }[];
  country?: { id: string; name: string; historicalName?: string | null; iso2?: string | null };
  region?: { id: string; name: string } | null;
}

export interface GeoSearchResult {
  countries: GeoCountryRecord[];
  regions: (GeoRegionRecord & { country?: { id: string; name: string } })[];
  cities: GeoCityRecord[];
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
  ocrText?: string | null;
}

export interface DocumentDownloadUrlResponse {
  documentId: string;
  downloadUrl: string;
  mimeType: string;
  title: string;
  expiresInSeconds: number;
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

/** Community / forum (PROMPT 8) */
export interface CommunityGroupRecord {
  id: string;
  type: string;
  title: string;
  description?: string | null;
  visibility: string;
  ownerId: string;
  slug?: string | null;
  regionLabel?: string | null;
  countryCode?: string | null;
  periodFrom?: number | null;
  periodTo?: number | null;
  createdAt?: string;
  updatedAt?: string;
  owner?: { id: string; displayName: string | null };
  _count?: { posts: number };
}

export interface CommunityForumThread {
  id: string;
  groupId: string;
  authorId: string;
  title: string;
  tags: string[];
  status: string;
  documentId?: string | null;
  contentStatus: string;
  createdAt: string;
  updatedAt: string;
  author?: { id: string; displayName: string | null };
  _count?: { posts: number };
  group?: CommunityGroupRecord;
  document?: { id: string; title: string; documentType: string } | null;
}

export interface CommunityForumPost {
  id: string;
  threadId: string;
  authorId: string;
  content: string;
  attachments?: unknown;
  referencesLivingPersonData: boolean;
  hasConsentForPublicLivingData: boolean;
  contentStatus: string;
  isExpertAnswer: boolean;
  helpfulCount: number;
  createdAt: string;
  updatedAt: string;
  author?: { id: string; displayName: string | null };
  authorReputationInGroup?: number;
  viewerMarkedHelpful?: boolean;
}

export interface CommunityGraphqlResponse<T = unknown> {
  data?: T;
  errors?: { message: string }[];
}

export type ModerationReportCategory =
  | 'SPAM'
  | 'HARASSMENT'
  | 'PERSONAL_DATA_LIVING'
  | 'MISINFORMATION'
  | 'OFF_TOPIC'
  | 'COPYRIGHT'
  | 'OTHER';

export type ModerationReportStatus = 'OPEN' | 'UNDER_REVIEW' | 'RESOLVED' | 'DISMISSED';

export interface ModerationTargetPreview {
  kind: string;
  content?: string;
  threadId?: string;
  threadTitle?: string;
  groupId?: string;
  groupTitle?: string;
  authorId?: string;
  authorName?: string | null;
  contentStatus?: string;
}

export interface ModerationReportRecord {
  id: string;
  reporterId: string;
  targetType: string;
  targetId: string;
  category: ModerationReportCategory;
  details?: string | null;
  status: ModerationReportStatus;
  createdAt: string;
  updatedAt: string;
  reporter?: { id: string; displayName: string | null };
  targetPreview?: ModerationTargetPreview | null;
}

export interface ModerationPendingPostRecord {
  id: string;
  threadId: string;
  authorId: string;
  content: string;
  referencesLivingPersonData: boolean;
  hasConsentForPublicLivingData: boolean;
  contentStatus: string;
  createdAt: string;
  author: { id: string; displayName: string | null };
  thread: {
    id: string;
    title: string;
    groupId: string;
    group: { id: string; title: string };
  };
}

export interface ModerationQueueResponse {
  stats: { openReports: number; underReview: number; pendingPosts: number };
  reports: ModerationReportRecord[];
  pendingPosts: ModerationPendingPostRecord[];
}

export const apiClient = {
  login: (dto: LoginDto) => apiPost<LoginResponse>('/auth/login', dto),
  mfa: {
    verify: (mfaSessionToken: string, code: string) =>
      apiPost<AuthSession>('/auth/mfa/verify', { mfaSessionToken, code }),
    status: (token: string) =>
      apiGet<{ totpEnabled: boolean; passkeysEnabled: boolean; passkeyCount: number }>('/auth/mfa/status', token),
    enrollStart: (token: string) => apiPost<import('@family/shared').MfaEnrollStartResult>('/auth/mfa/totp/enroll/start', {}, token),
    enrollVerify: (code: string, token: string) =>
      apiPost<import('@family/shared').MfaEnrollVerifyResult>('/auth/mfa/totp/enroll/verify', { code }, token),
    listPasskeys: (token: string) =>
      apiGet<import('@family/shared').WebAuthnCredentialSummary[]>('/auth/mfa/passkeys', token),
    passkeyRegisterOptions: (token: string) =>
      apiPost<Record<string, unknown>>('/auth/mfa/passkeys/register/options', {}, token),
    passkeyRegisterVerify: (response: unknown, token: string, deviceName?: string) =>
      apiPost<{ verified: boolean }>('/auth/mfa/passkeys/register/verify', { response, deviceName }, token),
    passkeyAuthOptions: (mfaSessionToken: string) =>
      apiPost<Record<string, unknown>>('/auth/mfa/passkeys/auth/options', { mfaSessionToken }),
    passkeyAuthVerify: (mfaSessionToken: string, response: unknown) =>
      apiPost<AuthSession>('/auth/mfa/passkeys/auth/verify', { mfaSessionToken, response }),
  },
  admin: {
    stats: (token: string) => apiGet<import('@family/shared').AdminStatsResponse>('/admin/stats', token),
    ops: (token: string) => apiGet<import('@family/shared').AdminOpsOverview>('/admin/ops', token),
    users: (token: string, params?: { limit?: number; offset?: number }) => {
      const query = new URLSearchParams();
      if (params?.limit != null) query.set('limit', String(params.limit));
      if (params?.offset != null) query.set('offset', String(params.offset));
      const suffix = query.size ? `?${query}` : '';
      return apiGet<import('@family/shared').AdminUserListResponse>(`/admin/users${suffix}`, token);
    },
    createUser: (token: string, body: import('@family/shared').AdminCreateUserInput) =>
      apiPost<import('@family/shared').AdminUserSummary>('/admin/users', body, token),
    updateUser: (token: string, id: string, body: import('@family/shared').AdminUpdateUserInput) =>
      apiPatch<import('@family/shared').AdminUserSummary>(`/admin/users/${id}`, body, token),
    softDeleteUser: (token: string, id: string, body: import('@family/shared').AdminSoftDeleteUserInput) =>
      apiPost<import('@family/shared').AdminUserSummary>(`/admin/users/${id}/soft-delete`, body, token),
  },
  public: {
    resolveShare: (shareToken: string) => apiGet<unknown>(`/public/share/${shareToken}`),
    resolveMemorial: (token: string) => apiGet<unknown>(`/public/memorial/${token}`),
  },
  workspaceExport: {
    request: (workspaceId: string, token: string) =>
      apiPost<import('@family/shared').WorkspaceExportJobSummary>(`/workspaces/${workspaceId}/exports`, {}, token),
    list: (workspaceId: string, token: string) =>
      apiGet<import('@family/shared').WorkspaceExportJobSummary[]>(`/workspaces/${workspaceId}/exports`, token),
    get: (workspaceId: string, jobId: string, token: string) =>
      apiGet<import('@family/shared').WorkspaceExportJobSummary>(`/workspaces/${workspaceId}/exports/${jobId}`, token),
  },
  registerFirstAdmin: (dto: RegisterFirstAdminInput) => apiPost<AuthSession>('/auth/register-first-admin', dto),
  me: (token?: string | null) => apiGet<AuthSession['user']>('/users/me', token),
  persons: {
    list: (token?: string | null) => apiGet<PersonSummary[]>('/persons', token),
    one: (id: string, token?: string | null) => apiGet<PersonSummary>(`/persons/${id}`, token),
    create: (input: unknown, token?: string | null) => apiPost<PersonSummary>('/persons', input, token),
    update: (id: string, input: unknown, token?: string | null, expectedVersion?: number) =>
      apiPatch<PersonSummary>(
        `/persons/${id}`,
        expectedVersion != null ? { ...(input as object), expectedVersion } : input,
        token,
      ),
    remove: (id: string, token?: string | null) => apiDelete<PersonSummary>(`/persons/${id}`, token),
  },
  families: {
    list: (token?: string | null) => apiGet<FamilyRecord[]>('/families', token),
    one: (id: string, token?: string | null) => apiGet<FamilyRecord>(`/families/${id}`, token),
    create: (input: unknown, token?: string | null) => apiPost<FamilyRecord>('/families', input, token),
    update: (id: string, input: unknown, token?: string | null) => apiPatch<FamilyRecord>(`/families/${id}`, input, token),
    addMember: (familyId: string, input: { personId: string; role: string }, token?: string | null) =>
      apiPost<FamilyRecord>(`/families/${familyId}/members`, input, token),
    updateMember: (familyId: string, memberId: string, input: { role: string }, token?: string | null) =>
      apiPatch<FamilyRecord>(`/families/${familyId}/members/${memberId}`, input, token),
    removeMember: (familyId: string, memberId: string, token?: string | null) =>
      apiDelete<FamilyRecord>(`/families/${familyId}/members/${memberId}`, token),
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
    countries: (century?: string, token?: string | null, locale?: AppLocale | null) => {
      const params = new URLSearchParams();
      if (century) params.set('century', century);
      appendLang(params, locale);
      const query = params.toString() ? `?${params}` : '';
      return apiGet<GeoCountryRecord[]>(`/places/countries${query}`, token);
    },
    regions: (countryId: string, century?: string, token?: string | null, locale?: AppLocale | null) => {
      const params = new URLSearchParams({ countryId });
      if (century) params.set('century', century);
      appendLang(params, locale);
      return apiGet<GeoRegionRecord[]>(`/places/regions?${params}`, token);
    },
    cities: (
      countryId: string,
      regionId?: string,
      century?: string,
      token?: string | null,
      locale?: AppLocale | null,
    ) => {
      const params = new URLSearchParams({ countryId });
      if (regionId) params.set('regionId', regionId);
      if (century) params.set('century', century);
      appendLang(params, locale);
      return apiGet<GeoCityRecord[]>(`/places/cities?${params}`, token);
    },
    search: (
      q: string,
      options?: {
        century?: string;
        countryId?: string;
        regionId?: string;
        token?: string | null;
        locale?: AppLocale | null;
      },
    ) => {
      const params = new URLSearchParams({ q });
      if (options?.century) params.set('century', options.century);
      if (options?.countryId) params.set('countryId', options.countryId);
      if (options?.regionId) params.set('regionId', options.regionId);
      appendLang(params, options?.locale);
      return apiGet<GeoSearchResult>(`/places/search?${params}`, options?.token);
    },
    create: (input: unknown, token?: string | null) => apiPost<PlaceRecord>('/places', input, token),
    remove: (id: string, token?: string | null) => apiDelete<PlaceRecord>(`/places/${id}`, token),
  },
  documents: {
    list: (token?: string | null) => apiGet<DocumentRecord[]>('/documents', token),
    one: (id: string, token?: string | null) => apiGet<DocumentRecord>(`/documents/${id}`, token),
    downloadUrl: (id: string, token?: string | null) =>
      apiGet<DocumentDownloadUrlResponse>(`/documents/${id}/download-url`, token),
    uploadUrl: (input: { fileName: string; mimeType: string; sizeBytes: number }, token?: string | null) =>
      apiPost<MediaUploadUrlResponse>('/documents/upload-url', input, token),
    create: (input: unknown, token?: string | null) => apiPost<DocumentRecord>('/documents', input, token),
    update: (id: string, input: { ocrText?: string }, token?: string | null) =>
      apiPatch<DocumentRecord>(`/documents/${id}`, input, token),
    remove: (id: string, token?: string | null) => apiDelete<DocumentRecord>(`/documents/${id}`, token),
  },
  documentIntelligence: {
    ocr: (body: { documentId: string; language?: string }, token?: string | null) =>
      apiPost<unknown>('/document-intelligence/ocr', body, token),
    entities: (body: { documentId: string; language?: string }, token?: string | null) =>
      apiPost<unknown>('/document-intelligence/entities', body, token),
    events: (body: { documentId: string; language?: string; knownPersonIds?: string[] }, token?: string | null) =>
      apiPost<unknown>('/document-intelligence/events', body, token),
    relationships: (
      body: { documentId: string; language?: string; knownPersonIds?: string[] },
      token?: string | null,
    ) => apiPost<unknown>('/document-intelligence/relationships', body, token),
    summary: (body: { documentId: string; language?: string }, token?: string | null) =>
      apiPost<unknown>('/document-intelligence/summary', body, token),
    results: (documentId: string, token?: string | null) =>
      apiGet<unknown>(`/document-intelligence/${documentId}/results`, token),
    confirmEvent: (documentId: string, body: unknown, token?: string | null) =>
      apiPost<unknown>(`/document-intelligence/${documentId}/confirm-event`, body, token),
    confirmRelationship: (documentId: string, body: unknown, token?: string | null) =>
      apiPost<unknown>(`/document-intelligence/${documentId}/confirm-relationship`, body, token),
    confirmCitation: (documentId: string, body: unknown, token?: string | null) =>
      apiPost<unknown>(`/document-intelligence/${documentId}/confirm-citation`, body, token),
    reject: (
      documentId: string,
      body: { suggestionId: string; kind: 'event' | 'relationship' | 'entity' },
      token?: string | null,
    ) => apiPost<unknown>(`/document-intelligence/${documentId}/reject`, body, token),
  },
  documentOcr: {
    enqueue: (documentId: string, token?: string | null, language = 'ru', force = false) =>
      apiPost<{ id: string; status: string }>(
        `/document-ocr/${documentId}/enqueue?language=${encodeURIComponent(language)}${force ? '&force=true' : ''}`,
        {},
        token,
      ),
    status: (documentId: string, token?: string | null) =>
      apiGet<{
        documentId: string;
        id?: string;
        status: string | null;
        error?: string | null;
        language?: string;
        completedAt?: string | null;
        createdAt?: string;
        updatedAt?: string;
      }>(`/document-ocr/${documentId}/status`, token),
  },
  storytelling: {
    generatePerson: (
      personId: string,
      body: import('@family/shared').GeneratePersonStoryRequestDto,
      token?: string | null,
    ) => apiPost<import('@family/shared').StoryDraftDto>(`/storytelling/person/${personId}/generate`, body, token),
    generateTimelineNarrative: (
      personId: string,
      body: import('@family/shared').GenerateTimelineNarrativeRequestDto,
      token?: string | null,
    ) =>
      apiPost<import('@family/shared').StoryDraftDto>(`/storytelling/timeline/${personId}/narrative`, body, token),
    generateDocumentSummary: (
      documentId: string,
      body: import('@family/shared').GenerateDocumentSummaryRequestDto,
      token?: string | null,
    ) =>
      apiPost<import('@family/shared').StoryDraftDto>(`/storytelling/document/${documentId}/summary`, body, token),
    generateFamily: (
      familyId: string,
      body: { mode?: import('@family/shared').StoryModeId; language?: string },
      token?: string | null,
    ) => apiPost<import('@family/shared').StoryDraftDto>(`/storytelling/family/${familyId}/generate`, body, token),
    generateMigration: (
      body: {
        mode?: import('@family/shared').StoryModeId;
        language?: string;
        personId?: string;
        familyId?: string;
        personIds?: string[];
      },
      token?: string | null,
    ) => apiPost<import('@family/shared').StoryDraftDto>(`/storytelling/migration/generate`, body, token),
    generateEraContext: (
      body: {
        mode?: import('@family/shared').StoryModeId;
        language?: string;
        personId?: string;
        familyId?: string;
        yearFrom?: number;
        yearTo?: number;
      },
      token?: string | null,
    ) => apiPost<import('@family/shared').StoryDraftDto>(`/storytelling/era-context`, body, token),
    draftsList: (
      query: {
        type?: import('@family/shared').StoryTypeId;
        personId?: string;
        familyId?: string;
        documentId?: string;
        q?: string;
      } = {},
      token?: string | null,
    ) => {
      const qs = new URLSearchParams();
      if (query.type) qs.set('type', query.type);
      if (query.personId) qs.set('personId', query.personId);
      if (query.familyId) qs.set('familyId', query.familyId);
      if (query.documentId) qs.set('documentId', query.documentId);
      if (query.q?.trim()) qs.set('q', query.q.trim());
      const suffix = qs.toString() ? `?${qs}` : '';
      return apiGet<import('@family/shared').StoryDraftDto[]>(`/storytelling/drafts${suffix}`, token);
    },
    draftOne: (id: string, token?: string | null) =>
      apiGet<import('@family/shared').StoryDraftDto>(`/storytelling/drafts/${id}`, token),
    updateDraft: (id: string, body: import('@family/shared').UpdateStoryDraftRequestDto, token?: string | null) =>
      apiPatch<import('@family/shared').StoryDraftDto>(`/storytelling/drafts/${id}`, body, token),
    factCheckDraft: (id: string, token?: string | null) =>
      apiPost<import('@family/shared').StoryDraftDto>(`/storytelling/drafts/${id}/fact-check`, {}, token),
    deleteDraft: (id: string, token?: string | null) =>
      apiDelete<{ ok: boolean }>(`/storytelling/drafts/${id}`, token),
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
    one: (id: string, token?: string | null) => apiGet<unknown>(`/media/${id}`, token),
    downloadUrl: (id: string, token?: string | null) =>
      apiGet<{ downloadUrl: string; mediaId: string }>(`/media/${id}/download-url`, token),
    uploadUrl: (input: { fileName: string; mimeType: string; sizeBytes: number }, token?: string | null) =>
      apiPost<MediaUploadUrlResponse>('/media/upload-url', input, token),
    metadata: (input: MediaMetadataInput, token?: string | null) => apiPost('/media/metadata', input, token),
    remove: (id: string, token?: string | null) => apiDelete<{ id: string }>(`/media/${id}`, token),
    link: (
      id: string,
      body: { entityType: string; entityId: string },
      token?: string | null,
    ) => apiPost(`/media/${id}/link`, body, token),
  },
  photoIntelligence: {
    workspace: (mediaId: string, token?: string | null) =>
      apiGet<import('@family/shared').PhotoWorkspacePayload>(`/media/${mediaId}/workspace`, token),
    suggestPerson: (mediaId: string, faceTagId?: string, token?: string | null) => {
      const qs = faceTagId ? `?faceTagId=${encodeURIComponent(faceTagId)}` : '';
      return apiGet<import('@family/shared').PersonMatchSuggestion[]>(
        `/media/${mediaId}/suggest-person${qs}`,
        token,
      );
    },
    createFaceTag: (
      mediaId: string,
      body: {
        x: number;
        y: number;
        width: number;
        height: number;
        personId?: string;
        label?: string;
        note?: string;
        confidence?: number;
      },
      token?: string | null,
    ) => apiPost<import('@family/shared').PhotoFaceTagRecord>(`/media/${mediaId}/face-tags`, body, token),
    updateFaceTag: (
      mediaId: string,
      tagId: string,
      body: { personId?: string; label?: string; note?: string },
      token?: string | null,
    ) =>
      apiPatch<import('@family/shared').PhotoFaceTagRecord>(
        `/media/${mediaId}/face-tags/${tagId}`,
        body,
        token,
      ),
    deleteFaceTag: (mediaId: string, tagId: string, token?: string | null) =>
      apiDelete(`/media/${mediaId}/face-tags/${tagId}`, token),
    addComment: (mediaId: string, body: string, token?: string | null) =>
      apiPost(`/media/${mediaId}/comments`, { body }, token),
    enqueueAnalysis: (mediaId: string, token?: string | null) =>
      apiPost(`/photo-analysis/${mediaId}/enqueue`, {}, token),
    analysisStatus: (mediaId: string, token?: string | null) =>
      apiGet(`/photo-analysis/${mediaId}/status`, token),
    bulkQueue: (token?: string | null) =>
      apiGet<import('@family/shared').BulkTaggingMediaItem[]>('/media/bulk-tagging', token),
    bulkAssign: (
      assignments: Array<{ faceTagId: string; personId: string }>,
      token?: string | null,
    ) => apiPost('/media/bulk-tagging/assign', { assignments }, token),
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
    viewData: (personId: string, query: import('@family/shared').TreeViewDataQuery, token?: string | null) => {
      const params = new URLSearchParams();
      if (query.scope) params.set('scope', query.scope);
      if (query.depth != null) params.set('depth', String(query.depth));
      if (query.generationMin != null) params.set('generationMin', String(query.generationMin));
      if (query.generationMax != null) params.set('generationMax', String(query.generationMax));
      if (query.lineage) params.set('lineage', query.lineage);
      if (query.yearFrom != null) params.set('yearFrom', String(query.yearFrom));
      if (query.yearTo != null) params.set('yearTo', String(query.yearTo));
      if (query.country?.trim()) params.set('country', query.country.trim());
      if (query.surname?.trim()) params.set('surname', query.surname.trim());
      const qs = params.toString();
      return apiGet<import('@family/shared').TreeViewDataResponse>(
        `/tree/person/${personId}/view-data${qs ? `?${qs}` : ''}`,
        token,
      );
    },
  },
  timeline: {
    person: (personId: string, token?: string | null) =>
      apiGet<PersonTimelineResponse>(`/timeline/person/${personId}`, token),
  },
  map: {
    person: (personId: string, query: import('@family/shared').MapQuery = {}, token?: string | null) => {
      const params = buildMapQueryParams(query);
      const qs = params.toString();
      return apiGet<import('@family/shared').MapPayload>(
        `/map/person/${personId}${qs ? `?${qs}` : ''}`,
        token,
      );
    },
    family: (familyId: string, query: import('@family/shared').MapQuery = {}, token?: string | null) => {
      const params = buildMapQueryParams(query);
      const qs = params.toString();
      return apiGet<import('@family/shared').MapPayload>(
        `/map/family/${familyId}${qs ? `?${qs}` : ''}`,
        token,
      );
    },
    tree: (treeId: string, query: import('@family/shared').MapQuery = {}, token?: string | null) => {
      const params = buildMapQueryParams(query);
      const qs = params.toString();
      return apiGet<import('@family/shared').MapPayload>(`/map/tree/${treeId}${qs ? `?${qs}` : ''}`, token);
    },
    migrationPath: (query: import('@family/shared').MigrationPathQuery, token?: string | null) => {
      const params = buildMapQueryParams(query);
      for (const id of query.personIds) params.append('personIds', id);
      return apiGet<import('@family/shared').MapPayload>(`/map/migration-path?${params}`, token);
    },
  },
  gamification: {
    dashboard: (token?: string | null) =>
      apiGet<import('@family/shared').GamificationDashboardPayload>('/gamification/dashboard', token),
    progress: (token?: string | null) => apiGet('/gamification/progress', token),
    score: (token?: string | null) => apiGet<import('@family/shared').FamilyDiscoveryScore>('/gamification/score', token),
    quests: (token?: string | null) => apiGet('/gamification/quests', token),
    achievements: (token?: string | null) => apiGet('/gamification/achievements', token),
    gaps: (token?: string | null) => apiGet('/gamification/gaps', token),
    mysteries: (token?: string | null) => apiGet('/gamification/mysteries', token),
    leaderboard: (token?: string | null) =>
      apiGet<import('@family/shared').QuestLeaderboardResponse>('/gamification/leaderboard', token),
    leaderboardOptIn: (token?: string | null) =>
      apiGet<import('@family/shared').QuestLeaderboardOptInDto>('/gamification/leaderboard/opt-in', token),
    setLeaderboardOptIn: (body: { optedIn: boolean; displayName?: string | null }, token?: string | null) =>
      apiPatch<import('@family/shared').QuestLeaderboardOptInDto>('/gamification/leaderboard/opt-in', body, token),
  },
  community: {
    groupsList: (params: { type?: string; q?: string } = {}, token?: string | null) => {
      const qs = new URLSearchParams();
      if (params.type) qs.set('type', params.type);
      if (params.q?.trim()) qs.set('q', params.q.trim());
      const suffix = qs.toString() ? `?${qs}` : '';
      return apiGet<CommunityGroupRecord[]>(`/community/groups${suffix}`, token);
    },
    groupOne: (id: string, token?: string | null) =>
      apiGet<CommunityGroupRecord>(`/community/groups/${id}`, token),
    threadsByGroup: (groupId: string, query: { skip?: number; take?: number } = {}, token?: string | null) => {
      const qs = new URLSearchParams();
      if (query.skip != null) qs.set('skip', String(query.skip));
      if (query.take != null) qs.set('take', String(query.take));
      const suffix = qs.toString() ? `?${qs}` : '';
      return apiGet<CommunityForumThread[]>(`/community/groups/${groupId}/threads${suffix}`, token);
    },
    createThread: (groupId: string, body: { title: string; tags?: string[]; documentId?: string }, token: string) =>
      apiPost<CommunityForumThread>(`/community/groups/${groupId}/threads`, body, token),
    threadOne: (threadId: string, token?: string | null) =>
      apiGet<CommunityForumThread>(`/community/threads/${threadId}`, token),
    postsByThread: (threadId: string, query: { skip?: number; take?: number } = {}, token?: string | null) => {
      const qs = new URLSearchParams();
      if (query.skip != null) qs.set('skip', String(query.skip));
      if (query.take != null) qs.set('take', String(query.take));
      const suffix = qs.toString() ? `?${qs}` : '';
      return apiGet<CommunityForumPost[]>(`/community/threads/${threadId}/posts${suffix}`, token);
    },
    createPost: (
      threadId: string,
      body: {
        content: string;
        attachments?: Array<{ mediaId?: string; documentId?: string }>;
        referencesLivingPersonData?: boolean;
        hasConsentForPublicLivingData?: boolean;
      },
      token: string,
    ) => apiPost<CommunityForumPost>(`/community/threads/${threadId}/posts`, body, token),
    markHelpful: (postId: string, token: string) =>
      apiPost<{ ok: boolean }>(`/community/posts/${postId}/helpful`, {}, token),
    graphql: <T = unknown>(body: { query: string; variables?: Record<string, unknown> }, token?: string | null) =>
      apiPost<CommunityGraphqlResponse<T>>('/community/graphql', body, token),
    createReport: (
      body: {
        targetType: string;
        targetId: string;
        category: ModerationReportCategory;
        details?: string;
      },
      token: string,
    ) => apiPost<ModerationReportRecord>('/community/moderation/reports', body, token),
    moderationQueue: (token: string) =>
      apiGet<ModerationQueueResponse>('/community/moderation/queue', token),
    approvePost: (postId: string, token: string) =>
      apiPost<{ ok: boolean }>(`/community/moderation/posts/${postId}/approve`, {}, token),
    hidePost: (
      postId: string,
      body: { moderatorNote?: string; applyStrikeToAuthor?: boolean },
      token: string,
    ) => apiPost<{ ok: boolean }>(`/community/moderation/posts/${postId}/hide`, body, token),
    resolveReport: (
      reportId: string,
      body: {
        status: ModerationReportStatus;
        moderatorNote?: string;
        applyStrikeToTargetAuthor?: boolean;
      },
      token: string,
    ) => apiPost<{ ok: boolean }>(`/community/moderation/reports/${reportId}/resolve`, body, token),
  },
  familyStories: {
    list: (token: string) =>
      apiGet<import('@family/shared').FamilyStorySummaryDto[]>('/family-stories', token),
    one: (id: string, token: string) =>
      apiGet<import('@family/shared').FamilyStoryDetailDto>(`/family-stories/${id}`, token),
    create: (body: Record<string, unknown>, token: string) =>
      apiPost<import('@family/shared').FamilyStoryCreateResultDto>('/family-stories', body, token),
    update: (id: string, body: Record<string, unknown>, token: string) =>
      apiPatch<import('@family/shared').FamilyStoryDetailDto>(`/family-stories/${id}`, body, token),
    remove: (id: string, token: string) =>
      apiRequest<{ ok: boolean }>(`/family-stories/${id}`, { method: 'DELETE', token }),
    preview: (id: string, token: string) =>
      apiGet<import('@family/shared').PublicFamilyStoryPayloadDto>(
        `/family-stories/${id}/preview`,
        token,
      ),
    generateNarrative: (id: string, body: { language?: string }, token: string) =>
      apiPost<import('@family/shared').FamilyStoryDetailDto>(
        `/family-stories/${id}/generate-narrative`,
        body,
        token,
      ),
    rotateToken: (id: string, token: string) =>
      apiPost<import('@family/shared').FamilyStoryCreateResultDto>(
        `/family-stories/${id}/rotate-token`,
        {},
        token,
      ),
    revokeToken: (id: string, token: string) =>
      apiPost<import('@family/shared').FamilyStoryDetailDto>(
        `/family-stories/${id}/revoke-token`,
        {},
        token,
      ),
    submitForReview: (id: string, token: string) =>
      apiPost<import('@family/shared').FamilyStoryDetailDto>(
        `/family-stories/${id}/submit-for-review`,
        {},
        token,
      ),
    moderationQueue: (token: string) =>
      apiGet<import('@family/shared').FamilyStoryModerationQueueItemDto[]>(
        '/family-stories/moderation/queue',
        token,
      ),
    moderationApprove: (id: string, body: { moderationNote?: string }, token: string) =>
      apiPost<import('@family/shared').FamilyStoryDetailDto>(
        `/family-stories/moderation/${id}/approve`,
        body,
        token,
      ),
    moderationReject: (id: string, body: { moderationNote: string }, token: string) =>
      apiPost<import('@family/shared').FamilyStoryDetailDto>(
        `/family-stories/moderation/${id}/reject`,
        body,
        token,
      ),
    publicByToken: (token: string) =>
      apiGet<import('@family/shared').PublicFamilyStoryPayloadDto>(
        `/public/family-stories/token/${encodeURIComponent(token)}`,
      ),
    publicPdfUrl: (token: string) =>
      `${getApiBaseUrl()}/public/family-stories/token/${encodeURIComponent(token)}/pdf`,
  },
  commercial: {
    plans: () => apiGet<import('@family/shared').SubscriptionPlanSummary[]>('/subscription-plans'),
    myWorkspaces: (token: string) =>
      apiGet<{ id: string; name: string; tenantName: string; role: string; isDefault: boolean }[]>(
        '/workspaces/me',
        token,
      ),
    overview: (workspaceId: string, token: string) =>
      apiGet<import('@family/shared').WorkspaceCommercialOverview>(
        `/workspaces/${workspaceId}/commercial`,
        token,
      ),
    members: (workspaceId: string, token: string) =>
      apiGet<import('@family/shared').WorkspaceMemberSummary[]>(
        `/workspaces/${workspaceId}/members`,
        token,
      ),
    changePlan: (workspaceId: string, planCode: string, token: string) =>
      apiPatch<import('@family/shared').WorkspaceCommercialOverview>(
        `/workspaces/${workspaceId}/subscription`,
        { planCode },
        token,
      ),
    updateBillingEmail: (workspaceId: string, billingEmail: string, token: string) =>
      apiPatch<import('@family/shared').WorkspaceCommercialOverview>(
        `/workspaces/${workspaceId}/billing`,
        { billingEmail },
        token,
      ),
    invites: (workspaceId: string, token: string) =>
      apiGet<import('@family/shared').WorkspaceInviteSummary[]>(
        `/workspaces/${workspaceId}/invites`,
        token,
      ),
    createInvite: (
      workspaceId: string,
      body: { email: string; role?: string },
      token: string,
    ) =>
      apiPost<{ invite: import('@family/shared').WorkspaceInviteSummary; acceptToken: string }>(
        `/workspaces/${workspaceId}/invites`,
        body,
        token,
      ),
    revokeInvite: (workspaceId: string, inviteId: string, token: string) =>
      apiPost<{ id: string }>(`/workspaces/${workspaceId}/invites/${inviteId}/revoke`, {}, token),
    acceptInvite: (tokenValue: string, token: string) =>
      apiPost<{ workspaceId: string; workspaceName: string }>(
        '/invites/accept',
        { token: tokenValue },
        token,
      ),
    auditLogs: (workspaceId: string, token: string) =>
      apiGet<import('@family/shared').AuditLogEntry[]>(
        `/workspaces/${workspaceId}/audit-logs`,
        token,
      ),
    privacyCenter: (token: string) =>
      apiGet<import('@family/shared').PrivacyCenterState>('/privacy/me', token),
    updateConsent: (matchProfileOptIn: boolean, token: string) =>
      apiPatch<import('@family/shared').PrivacyCenterState>(
        '/privacy/consent',
        { matchProfileOptIn },
        token,
      ),
    requestExport: (token: string) =>
      apiPost<import('@family/shared').PrivacyRequestSummary>('/privacy/export-request', {}, token),
    requestDelete: (token: string) =>
      apiPost<import('@family/shared').PrivacyRequestSummary>('/privacy/delete-request', {}, token),
    exportGdpr: (workspaceId: string, token: string) =>
      apiGet<Record<string, unknown>>(`/workspaces/${workspaceId}/export/gdpr`, token),
    exportGedcom: (workspaceId: string, familyId: string, token: string) =>
      apiGet<{ fileName: string; gedcomText: string }>(
        `/workspaces/${workspaceId}/export/gedcom?familyId=${encodeURIComponent(familyId)}`,
        token,
      ),
  },
  privacy: {
    securityCenter: (token: string) =>
      apiGet<import('@family/shared').PrivacySecurityCenterState>('/privacy/security-center', token),
    updateConsent: (
      body: { consentKey: string; granted: boolean },
      token: string,
    ) =>
      apiPatch<import('@family/shared').PrivacySecurityCenterState>(
        '/privacy/consents',
        body,
        token,
      ),
    personSettings: (personId: string, token: string) =>
      apiGet<import('@family/shared').PersonPrivacySettings>(
        `/privacy/persons/${personId}`,
        token,
      ),
    updatePerson: (
      personId: string,
      body: { privacyLevel?: string; isLiving?: boolean },
      token: string,
    ) =>
      apiPatch<import('@family/shared').PersonPrivacySettings>(
        `/privacy/persons/${personId}`,
        body,
        token,
      ),
    treeSettings: (familyId: string, token: string) =>
      apiGet<import('@family/shared').TreePrivacySettings>(
        `/privacy/families/${familyId}`,
        token,
      ),
    updateTree: (
      familyId: string,
      body: { hideLivingPersons?: boolean; treePrivacyLevel?: string },
      token: string,
    ) =>
      apiPatch<import('@family/shared').TreePrivacySettings>(
        `/privacy/families/${familyId}`,
        body,
        token,
      ),
    publicShares: (token: string) =>
      apiGet<import('@family/shared').PublicShareSummary[]>('/privacy/public-shares', token),
    createPublicShare: (
      body: {
        resourceType: string;
        resourceId: string;
        label?: string;
        hideLivingPersons?: boolean;
        workspaceId?: string;
        familyStoryId?: string;
        expiresAt?: string;
        neverExpires?: boolean;
      },
      token: string,
    ) =>
      apiPost<import('@family/shared').PublicShareCreateResult>(
        '/privacy/public-shares',
        body,
        token,
      ),
    revokePublicShare: (shareId: string, token: string) =>
      apiPost<{ ok: boolean }>(`/privacy/public-shares/${shareId}/revoke`, {}, token),
    accessLogs: (token: string, workspaceId?: string) =>
      apiGet<import('@family/shared').AccessLogEntry[]>(
        workspaceId
          ? `/privacy/access-logs?workspaceId=${encodeURIComponent(workspaceId)}`
          : '/privacy/access-logs',
        token,
      ),
    accountDelete: (token: string) =>
      apiPost<import('@family/shared').PrivacyRequestSummary>(
        '/privacy/account-delete',
        {},
        token,
      ),
  },
  messenger: {
    listConversations: (token: string) =>
      apiGet<import('@family/shared').ConversationSummary[]>('/conversations', token),
    getConversation: (id: string, token: string) =>
      apiGet<import('@family/shared').ConversationSummary>(`/conversations/${id}`, token),
    listMessages: (id: string, token: string, cursor?: string) =>
      apiGet<{ items: import('@family/shared').MessageSummary[]; nextCursor: string | null }>(
        `/conversations/${id}/messages${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''}`,
        token,
      ),
    createDirect: (participantUserId: string, token: string) =>
      apiPost<import('@family/shared').ConversationSummary>('/conversations/direct', { participantUserId }, token),
    createGroup: (title: string, participantUserIds: string[], token: string) =>
      apiPost<import('@family/shared').ConversationSummary>('/conversations/group', { title, participantUserIds }, token),
    sendMessage: (id: string, body: { body: string; attachmentMediaIds?: string[] }, token: string) =>
      apiPost<import('@family/shared').MessageSummary>(`/conversations/${id}/messages`, body, token),
    markRead: (id: string, token: string) =>
      apiPost<{ ok: boolean }>(`/conversations/${id}/read`, {}, token),
  },
  notifications: {
    list: (token: string, unreadOnly?: boolean) =>
      apiGet<import('@family/shared').NotificationSummary[]>(
        `/notifications${unreadOnly ? '?unreadOnly=true' : ''}`,
        token,
      ),
    unreadCount: (token: string) => apiGet<number>('/notifications/unread-count', token),
    markRead: (id: string, token: string) =>
      apiPatch<import('@family/shared').NotificationSummary>(`/notifications/${id}/read`, {}, token),
    markAllRead: (token: string) => apiPost<{ ok: boolean }>('/notifications/read-all', {}, token),
    preferences: (token: string, workspaceId?: string) =>
      apiGet<import('@family/shared').NotificationPreferenceSummary[]>(
        `/notifications/preferences${workspaceId ? `?workspaceId=${encodeURIComponent(workspaceId)}` : ''}`,
        token,
      ),
    updatePreference: (
      body: { source: import('@family/shared').NotificationSource; enabled: boolean; workspaceId?: string },
      token: string,
    ) => apiPatch<import('@family/shared').NotificationPreferenceSummary[]>('/notifications/preferences', body, token),
  },
  activityFeed: {
    list: (token: string, opts?: { type?: string; cursor?: string; limit?: number }) => {
      const params = new URLSearchParams();
      if (opts?.type) params.set('type', opts.type);
      if (opts?.cursor) params.set('cursor', opts.cursor);
      if (opts?.limit) params.set('limit', String(opts.limit));
      const q = params.toString();
      return apiGet<import('@family/shared').ActivityFeedResponse>(`/activity-feed${q ? `?${q}` : ''}`, token);
    },
  },
  calendar: {
    listEvents: (token: string, from?: string, to?: string) => {
      const params = new URLSearchParams();
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      const q = params.toString();
      return apiGet<import('@family/shared').CalendarEventSummary[]>(`/calendar/events${q ? `?${q}` : ''}`, token);
    },
    downloadIcal: async (token: string, from?: string, to?: string) => {
      const params = new URLSearchParams();
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      const q = params.toString();
      const res = await fetch(`${getApiBaseUrl()}/calendar/export.ics${q ? `?${q}` : ''}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new ApiError(res.status, '/calendar/export.ics');
      return res.text();
    },
  },
  collaboration: {
    getLock: (personId: string, token: string) =>
      apiGet<import('@family/shared').PersonEditLockSummary | null>(`/collaboration/persons/${personId}/lock`, token),
    acquireLock: (personId: string, token: string, field?: string) =>
      apiPost<import('@family/shared').PersonEditLockSummary>(`/collaboration/persons/${personId}/lock`, { field }, token),
    releaseLock: (personId: string, token: string) =>
      apiDelete<{ ok: boolean }>(`/collaboration/persons/${personId}/lock`, token),
  },
  searchAdvanced: {
    faceted: (token: string | null, params: Record<string, string | number | undefined>) => {
      const q = new URLSearchParams();
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined && v !== '') q.set(k, String(v));
      }
      return apiGet<import('@family/shared').FacetedSearchResults>(`/search/faceted?${q}`, token);
    },
    saved: (token: string) => apiGet<import('@family/shared').SavedSearchSummary[]>('/search/saved', token),
    createSaved: (body: { name: string; query: string; filters?: import('@family/shared').SearchFilters }, token: string) =>
      apiPost<import('@family/shared').SavedSearchSummary>('/search/saved', body, token),
    history: (token: string) => apiGet<import('@family/shared').SearchHistorySummary[]>('/search/history', token),
  },
  hints: {
    list: (token: string, status = 'OPEN') =>
      apiGet<import('@family/shared').HintSummary[]>(`/hints?status=${status}`, token),
    explain: (id: string, token: string) => apiGet<import('@family/shared').HintSummary>(`/hints/${id}`, token),
    accept: (id: string, token: string) => apiPost<import('@family/shared').HintSummary>(`/hints/${id}/accept`, {}, token),
    dismiss: (id: string, token: string) => apiPost<import('@family/shared').HintSummary>(`/hints/${id}/dismiss`, {}, token),
    sync: (token: string) => apiPost<void>('/hints/actions/sync', {}, token),
  },
  duplicateMerge: {
    preview: (survivorId: string, mergedId: string, token: string) =>
      apiPost<import('@family/shared').MergePreview>('/duplicate-merge/preview', { survivorId, mergedId }, token),
    execute: (
      survivorId: string,
      mergedId: string,
      token: string,
      fieldResolutions?: Record<string, import('@family/shared').MergeFieldDiff['resolution']>,
    ) =>
      apiPost<{ auditId: string }>('/duplicate-merge/execute', {
        survivorId,
        mergedId,
        confirm: true,
        ...(fieldResolutions ? { fieldResolutions } : {}),
      }, token),
    audits: (token: string) =>
      apiGet<import('@family/shared').PersonMergeAuditSummary[]>('/duplicate-merge/audits', token),
  },
  evidence: {
    listCitations: (token: string, personId?: string, eventId?: string) => {
      const params = new URLSearchParams();
      if (personId) params.set('personId', personId);
      if (eventId) params.set('eventId', eventId);
      const q = params.toString();
      return apiGet<import('@family/shared').EvidenceCitationSummary[]>(`/evidence/citations${q ? `?${q}` : ''}`, token);
    },
    exportBibliography: (token: string, format: 'text' | 'bibtex' | 'json' = 'text') =>
      apiGet<import('@family/shared').BibliographyExport>(`/evidence/bibliography/export?format=${format}`, token),
    createCitation: (
      body: { sourceId: string; personId?: string; eventId?: string; page?: string; detail?: string },
      token: string,
    ) => apiPost<import('@family/shared').EvidenceCitationSummary>('/evidence/citations', body, token),
    listTemplates: (token: string) =>
      apiGet<import('@family/shared').CitationTemplateSummary[]>('/evidence/templates', token),
  },
  wiki: {
    list: (token: string, familyId?: string) =>
      apiGet<import('@family/shared').WikiPageSummary[]>(
        `/wiki${familyId ? `?familyId=${encodeURIComponent(familyId)}` : ''}`,
        token,
      ),
    getBySlug: (slug: string, token: string) =>
      apiGet<import('@family/shared').WikiPageSummary & { revisions: import('@family/shared').WikiRevisionSummary[] }>(
        `/wiki/pages/${encodeURIComponent(slug)}`,
        token,
      ),
    create: (body: { slug: string; title: string; content: string; familyId?: string }, token: string) =>
      apiPost<import('@family/shared').WikiPageSummary>('/wiki', body, token),
    update: (id: string, body: { title?: string; content?: string }, token: string) =>
      apiPatch<import('@family/shared').WikiPageSummary>(`/wiki/${id}`, body, token),
  },
  matching: {
    profile: (token?: string | null) =>
      apiGet<import('@family/shared').MatchProfileDto>('/matching/profile', token),
    updateProfile: (isOptedIn: boolean, token: string) =>
      apiPatch<import('@family/shared').MatchProfileDto>('/matching/profile', { isOptedIn }, token),
    inbox: (token?: string | null) =>
      apiGet<import('@family/shared').TreeMatchCandidateDto[]>('/matching/inbox', token),
    personCandidates: (personId: string, token?: string | null) =>
      apiGet<import('@family/shared').TreeMatchCandidateDto[]>(
        `/matching/person/${personId}/candidates`,
        token,
      ),
    runForTree: (familyId: string, token: string) =>
      apiPost<import('@family/shared').TreeMatchRunDto>(`/matching/tree/${familyId}/run`, {}, token),
    candidate: (candidateId: string, token?: string | null) =>
      apiGet<import('@family/shared').TreeMatchCandidateDto & { mergeSuggestion?: unknown }>(
        `/matching/candidate/${candidateId}`,
        token,
      ),
    accept: (candidateId: string, token: string) =>
      apiPost<import('@family/shared').TreeMatchCandidateDto & { mergeSuggestion?: unknown }>(
        `/matching/candidate/${candidateId}/accept`,
        {},
        token,
      ),
    reject: (candidateId: string, token: string) =>
      apiPost<import('@family/shared').TreeMatchCandidateDto>(
        `/matching/candidate/${candidateId}/reject`,
        {},
        token,
      ),
  },
  faceClustering: {
    peopleSummary: (token: string) =>
      apiGet<import('@family/shared').PeopleSummaryDto>('/media/people/summary', token),
    listClusters: (token: string, status?: string) =>
      apiGet<import('@family/shared').FaceClusterSummaryDto[]>(
        `/face-clusters${status ? `?status=${encodeURIComponent(status)}` : ''}`,
        token,
      ),
    cluster: (id: string, token: string) =>
      apiGet<import('@family/shared').FaceClusterSummaryDto & { members: import('@family/shared').FaceClusterMemberDto[] }>(
        `/face-clusters/${id}`,
        token,
      ),
    rebuild: (token: string) => apiPost<{ ok: boolean }>('/face-clusters/rebuild', {}, token),
    assignPerson: (clusterId: string, personId: string, token: string) =>
      apiPost<unknown>(`/face-clusters/${clusterId}/assign-person`, { personId }, token),
    merge: (sourceClusterId: string, targetClusterId: string, token: string) =>
      apiPost<unknown>(`/face-clusters/${sourceClusterId}/merge`, { targetClusterId }, token),
    split: (clusterId: string, embeddingIds: string[], token: string) =>
      apiPost<unknown>(`/face-clusters/${clusterId}/split`, { embeddingIds }, token),
  },
  memoryStories: {
    list: (token: string, personId?: string) =>
      apiGet<import('@family/shared').MemoryStoryDto[]>(
        `/memory-stories${personId ? `?personId=${encodeURIComponent(personId)}` : ''}`,
        token,
      ),
    one: (id: string, token: string) => apiGet<import('@family/shared').MemoryStoryDto>(`/memory-stories/${id}`, token),
    create: (body: unknown, token: string) =>
      apiPost<import('@family/shared').MemoryStoryDto>('/memory-stories', body, token),
    updateTranscript: (id: string, body: { text: string }, token: string) =>
      apiPatch<import('@family/shared').MemoryStoryDto>(`/memory-stories/${id}/transcript`, body, token),
    retryTranscript: (id: string, token: string) =>
      apiPost<{ ok: boolean }>(`/memory-stories/${id}/transcript/retry`, {}, token),
  },
  socialArchiveImport: {
    providers: (token: string) => apiGet<unknown[]>('/social-archive-import/providers', token),
    uploadUrl: (fileName: string, token: string) =>
      apiPost<{ storageKey: string; uploadUrl: string }>('/social-archive-import/upload-url', { fileName }, token),
    create: (body: unknown, token: string) => apiPost<unknown>('/social-archive-import', body, token),
    one: (id: string, token: string) => apiGet<unknown>(`/social-archive-import/${id}`, token),
    items: (id: string, token: string) => apiGet<unknown>(`/social-archive-import/${id}/items`, token),
    select: (id: string, body: unknown, token: string) =>
      apiPatch<unknown>(`/social-archive-import/${id}/items/selection`, body, token),
    confirm: (id: string, body: unknown, token: string) =>
      apiPost<unknown>(`/social-archive-import/${id}/confirm`, body, token),
  },
  askArchive: {
    ask: (body: { question: string; language?: string }, token: string) =>
      apiPost<import('@family/shared').AskArchiveAnswerDto>('/ask-archive', body, token),
  },
  webhooks: {
    listEndpoints: (token: string) =>
      apiGet<import('@family/shared').WebhookEndpointSummary[]>('/webhooks/endpoints', token),
    createEndpoint: (body: unknown, token: string) =>
      apiPost<import('@family/shared').WebhookEndpointCreateResult>('/webhooks/endpoints', body, token),
    listEvents: async (token: string, query?: string) => {
      const res = await apiGet<{ data: import('@family/shared').WebhookEventSummary[]; nextCursor: string | null }>(
        `/webhooks/events${query ? `?${query}` : ''}`,
        token,
      );
      return { items: res.data ?? [], nextCursor: res.nextCursor ?? null };
    },
    retryEvent: (eventId: string, token: string) =>
      apiPost<{ id: string; queued: boolean }>(`/webhooks/events/${eventId}/retry`, {}, token),
    testEndpoint: (id: string, token: string) =>
      apiPost<{ ok: boolean }>(`/webhooks/endpoints/${id}/test`, {}, token),
  },
  externalArchives: {
    providers: (token: string) => apiGet<unknown[]>('/external-archives/providers', token),
    quota: (token: string) => apiGet<{ quota: number; used: number; remaining: number }>('/external-archives/quota', token),
    search: (body: unknown, token: string) =>
      apiPost<{ searchId: string; status: string }>('/external-archives/search', body, token),
    getSearch: (id: string, token: string) => apiGet<unknown>(`/external-archives/searches/${id}`, token),
    importRecord: (body: unknown, token: string) => apiPost<unknown>('/external-archives/import', body, token),
    imported: (token: string) => apiGet<unknown[]>('/external-archives/imported', token),
  },
  branding: {
    get: (token: string) => apiGet<Record<string, unknown>>('/branding', token),
    update: (body: unknown, token: string) => apiPatch<Record<string, unknown>>('/branding', body, token),
    resolve: (host: string) => apiGet<Record<string, unknown>>(`/branding/resolve?host=${encodeURIComponent(host)}`),
    setCustomDomain: (customDomain: string, token: string) =>
      apiPut<Record<string, unknown>>('/branding/custom-domain', { customDomain }, token),
    verifyDomain: (token: string) => apiPost<Record<string, unknown>>('/branding/custom-domain/verify', {}, token),
    provisionSsl: (token: string) =>
      apiPost<Record<string, unknown>>('/branding/custom-domain/provision-ssl', {}, token),
    logoUploadUrl: (body: { fileName: string; mimeType: string }, token: string) =>
      apiPost<Record<string, unknown>>('/branding/logo/upload-url', body, token),
  },
  pdfExport: {
    templates: (token: string) => apiGet<unknown[]>('/export/templates', token),
    preview: (body: unknown, token: string) => apiPost<{ html: string }>('/export/preview', body, token),
    createJob: (body: unknown, token: string) => apiPost<unknown>('/export/jobs', body, token),
    getJob: (id: string, token: string) => apiGet<unknown>(`/export/jobs/${id}`, token),
  },
  dna: {
    profile: (token: string) => apiGet<unknown>('/dna/profile', token),
    matches: (token: string) => apiGet<unknown>('/dna/matches', token),
    grantConsent: (token: string) => apiPost<{ ok: boolean }>('/dna/consent/import', {}, token),
    uploadUrl: (fileName: string, token: string) =>
      apiPost<{ uploadUrl: string; storageKey: string }>('/dna/upload-url', { fileName }, token),
    createImportJob: (body: unknown, token: string) => apiPost<unknown>('/dna/import-jobs', body, token),
    deleteProfile: (token: string) => apiDelete<{ ok: boolean }>('/dna/profile', token),
  },
  cemetery: {
    listCemeteries: (token: string) => apiGet<unknown[]>('/cemetery', token),
    createCemetery: (body: unknown, token: string) => apiPost<unknown>('/cemetery', body, token),
    listBurialSites: (token: string) => apiGet<unknown[]>('/cemetery/burial-sites', token),
    createBurialSite: (body: unknown, token: string) => apiPost<unknown>('/cemetery/burial-sites', body, token),
    map: (token: string) => apiGet<unknown>('/cemetery/map', token),
    enableMemorialShare: (memorialId: string, token: string) =>
      apiPost<unknown>(`/cemetery/memorials/${memorialId}/share`, {}, token),
    reconstruction: (burialSiteId: string, token: string) =>
      apiGet<unknown>(`/cemetery/burial-sites/${burialSiteId}/reconstruction`, token),
    searchBurials: (q: string, token: string) =>
      apiGet<{ q: string; hits: unknown[] }>(`/cemetery/search?q=${encodeURIComponent(q)}`, token),
    requestPhotogrammetry: (burialSiteId: string, body: { sourceMediaId?: string }, token: string) =>
      apiPost<unknown>(`/cemetery/burial-sites/${burialSiteId}/reconstruction/request`, body, token),
    getPhotogrammetryJob: (jobId: string, token: string) =>
      apiGet<unknown>(`/cemetery/photogrammetry-jobs/${jobId}`, token),
    planRoute: (body: { burialSiteIds: string[] }, token: string) =>
      apiPost<unknown>('/cemetery/routes/plan', body, token),
    analyzePhoto: (body: { mediaId: string }, token: string) =>
      apiPost<unknown>('/cemetery/analyze-photo', body, token),
  },
  militaryHistory: {
    listConflicts: (token: string) =>
      apiGet<MilitaryConflictRecord[]>('/military-history/conflicts', token),
    listPending: (token: string) =>
      apiGet<MilitaryConflictRecord[]>('/military-history/conflicts/pending', token),
    listMyProposals: (token: string) =>
      apiGet<MilitaryConflictRecord[]>('/military-history/conflicts/proposals', token),
    proposeConflict: (body: { name: string; color?: string }, token: string) =>
      apiPost<MilitaryConflictRecord>('/military-history/conflicts', body, token),
    approveConflict: (id: string, body: { name?: string; color?: string }, token: string) =>
      apiPatch<MilitaryConflictRecord>(`/military-history/conflicts/${id}/approve`, body, token),
    rejectConflict: (id: string, token: string) =>
      apiPatch<MilitaryConflictRecord>(`/military-history/conflicts/${id}/reject`, {}, token),
    deleteConflict: (id: string, token: string) =>
      apiDelete<{ ok: boolean; id: string }>(`/military-history/conflicts/${id}`, token),
    cancelProposal: (id: string, token: string) =>
      apiDelete<{ ok: boolean; id: string }>(`/military-history/conflicts/proposals/${id}`, token),
  },
  onboarding: {
    progress: (token: string) =>
      apiGet<import('@family/shared').OnboardingProgressDto>('/onboarding/progress', token),
    updateProgress: (body: unknown, token: string) =>
      apiPatch<import('@family/shared').OnboardingProgressDto>('/onboarding/progress', body, token),
  },
  storyLocales: {
    list: (storyId: string, token: string) =>
      apiGet<import('@family/shared').StoryLocaleDto[]>(`/stories/${storyId}/locales`, token),
    one: (storyId: string, locale: string, token: string) =>
      apiGet<import('@family/shared').StoryLocaleDto>(`/stories/${storyId}/locales/${locale}`, token),
    translate: (storyId: string, body: { targetLocale: string; sourceLocale?: string }, token: string) =>
      apiPost<{ locale: import('@family/shared').StoryLocaleDto; job: import('@family/shared').StoryTranslationJobDto }>(
        `/stories/${storyId}/locales/translate`,
        body,
        token,
      ),
  },
  push: {
    subscribe: (body: { endpoint?: string }, token: string) =>
      apiPost<{ ok: boolean; stub: boolean }>('/push/subscribe', body, token),
  },
};

function buildMapQueryParams(query: import('@family/shared').MapQuery) {
  const params = new URLSearchParams();
  if (query.yearFrom != null) params.set('yearFrom', String(query.yearFrom));
  if (query.yearTo != null) params.set('yearTo', String(query.yearTo));
  if (query.eventTypes?.length) query.eventTypes.forEach((t) => params.append('eventTypes', t));
  if (query.includeHistoricalNames) params.set('includeHistoricalNames', 'true');
  if (query.scope) params.set('scope', query.scope);
  if (query.depth != null) params.set('depth', String(query.depth));
  if (query.generationMin != null) params.set('generationMin', String(query.generationMin));
  if (query.generationMax != null) params.set('generationMax', String(query.generationMax));
  return params;
}

/** Alias for legacy imports in commercial/privacy modules. Prefer `apiClient`. */
export const api = apiClient;
