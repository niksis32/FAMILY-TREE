import type {
  ExternalArchiveProviderId,
  ExternalArchiveRecordSummary,
  ExternalArchiveSearchParams,
} from '@family/shared';

export interface ExternalRecordProviderMeta {
  id: ExternalArchiveProviderId;
  label: string;
  termsUrl: string;
  attributionTemplate: string;
}

export interface ExternalRecordProvider {
  readonly meta: ExternalRecordProviderMeta;
  search(params: ExternalArchiveSearchParams): Promise<ExternalArchiveRecordSummary[]>;
  getRecord(recordId: string): Promise<ExternalArchiveRecordSummary>;
}
