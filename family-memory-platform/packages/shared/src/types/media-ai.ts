export type FaceClusterStatus = 'UNREVIEWED' | 'CONFIRMED' | 'ASSIGNED' | 'MERGED' | 'ARCHIVED';

export interface FaceClusterSummaryDto {
  id: string;
  status: FaceClusterStatus;
  memberCount: number;
  personId?: string | null;
  personName?: string | null;
  label?: string | null;
  lastRebuildAt?: string | null;
}

export interface FaceClusterMemberDto {
  embeddingId: string;
  faceTagId: string;
  mediaId: string;
  distanceToCentroid: number;
  personId?: string | null;
}

export interface PeopleSummaryDto {
  totalFaces: number;
  unassignedFaces: number;
  pendingClusters: number;
  assignedClusters: number;
}

export type MemoryStoryStatus = 'DRAFT' | 'UPLOADING' | 'PROCESSING' | 'READY' | 'FAILED';

export interface TranscriptSegment {
  startMs: number;
  endMs: number;
  text: string;
  confidence?: number;
}

export interface MediaTranscriptDto {
  text: string;
  segments?: TranscriptSegment[];
  language: string;
  confidence?: number | null;
  editedAt?: string | null;
}

export interface MemoryStoryDto {
  id: string;
  title: string;
  description?: string | null;
  status: MemoryStoryStatus;
  subjectPersonId: string;
  subjectPersonName?: string;
  mediaId?: string | null;
  summary?: string | null;
  language: string;
  recordedAt?: string | null;
  transcript?: MediaTranscriptDto | null;
  uncertaintyNote?: string;
}

export type SocialArchiveProvider =
  | 'INSTAGRAM'
  | 'FACEBOOK'
  | 'TWITTER'
  | 'VK'
  | 'ODNOKLASSNIKI'
  | 'TELEGRAM'
  | 'UNKNOWN';

export type SocialArchiveImportStatus =
  | 'UPLOADED'
  | 'PARSING'
  | 'PREVIEW_READY'
  | 'PARSE_FAILED'
  | 'CONFIRMING'
  | 'COMPLETED'
  | 'CONFIRM_FAILED'
  | 'EXPIRED'
  | 'CANCELLED';

export interface SocialArchiveImportDto {
  id: string;
  provider: SocialArchiveProvider;
  status: SocialArchiveImportStatus;
  fileName: string;
  parsedCount: number;
  selectedCount: number;
  importedCount: number;
  error?: string | null;
  expiresAt?: string | null;
}

export interface SocialArchiveItemDto {
  id: string;
  externalId: string;
  kind: string;
  title?: string | null;
  caption?: string | null;
  takenAt?: string | null;
  selected: boolean;
  privacyFlags: string[];
  status: string;
}

export interface AskArchiveCitationDto {
  sourceType: 'document' | 'memory' | 'wiki' | 'person' | 'citation';
  entityId: string;
  title: string;
  excerpt: string;
  deepLink: string;
  confidence: number;
}

export interface AskArchiveAnswerDto {
  answer: string;
  citations: AskArchiveCitationDto[];
  assumptions: string[];
  uncertaintyScore: number;
  privacyRedacted: boolean;
}
