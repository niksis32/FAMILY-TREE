export type ExternalArchiveProviderId = 'FAMILYSEARCH';

export interface ExternalArchiveProviderSummary {
  id: ExternalArchiveProviderId;
  label: string;
  attributionRequired: boolean;
  termsUrl: string;
  devMode: boolean;
}

export interface ExternalArchiveSearchParams {
  givenName?: string;
  familyName?: string;
  birthYear?: number;
  deathYear?: number;
  place?: string;
  recordType?: string;
}

export interface ExternalArchiveRecordSummary {
  id: string;
  provider: ExternalArchiveProviderId;
  title: string;
  givenName?: string;
  familyName?: string;
  birthDate?: string;
  deathDate?: string;
  place?: string;
  recordType?: string;
  url?: string;
  attributionText: string;
}

export interface ExternalArchiveSearchJobSummary {
  id: string;
  provider: ExternalArchiveProviderId;
  status: 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'SKIPPED';
  query: ExternalArchiveSearchParams;
  resultCount?: number | null;
  results?: ExternalArchiveRecordSummary[];
  error?: string | null;
  queued: boolean;
  createdAt: string;
  completedAt?: string | null;
}

export interface ExternalArchiveImportResult {
  sourceId: string;
  hintId?: string | null;
  created: boolean;
  provider: ExternalArchiveProviderId;
  externalRecordId: string;
  attributionText: string;
}

export interface ExternalArchiveImportedSource {
  id: string;
  title: string;
  externalProvider: string;
  externalRecordId: string;
  attributionText?: string | null;
  url?: string | null;
  createdAt: string;
}
