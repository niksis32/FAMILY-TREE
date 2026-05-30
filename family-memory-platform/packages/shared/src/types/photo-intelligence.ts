export type FaceTagSource = 'MANUAL' | 'AI';

export type PhotoAnalysisStatus = 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'SKIPPED';

export type PeriodConfidenceLevel = 'high' | 'medium' | 'low' | 'unknown';

export interface PhotoFaceBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PhotoFaceTagRecord extends PhotoFaceBox {
  id: string;
  mediaId: string;
  personId?: string | null;
  confidence?: number | null;
  label?: string | null;
  note?: string | null;
  source: FaceTagSource;
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
  person?: {
    id: string;
    givenName: string;
    patronymic?: string | null;
    familyName?: string | null;
    birthDate?: string | null;
    deathDate?: string | null;
    isLiving?: boolean;
  } | null;
}

export interface PhotoInsightRecord {
  id: string;
  mediaId: string;
  estimatedYearFrom?: number | null;
  estimatedYearTo?: number | null;
  detectedObjects?: unknown;
  detectedClothingStyle?: string | null;
  aiDescription?: string | null;
  uncertaintyNotes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MediaCommentRecord {
  id: string;
  mediaId: string;
  authorId: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  author?: {
    id: string;
    displayName?: string | null;
    email: string;
  };
}

export interface PhotoAnalysisJobRecord {
  id: string;
  mediaId: string;
  status: PhotoAnalysisStatus;
  error?: string | null;
  requestedBy?: string | null;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PeriodConfidenceResult {
  level: PeriodConfidenceLevel;
  score: number;
  photoYear?: number | null;
  reasons: string[];
}

export interface PersonMatchSuggestion {
  personId: string;
  givenName: string;
  familyName?: string | null;
  patronymic?: string | null;
  confidence: number;
  reasons: string[];
  periodConfidence?: PeriodConfidenceResult;
}

export interface PhotoWorkspacePayload {
  media: {
    id: string;
    title?: string | null;
    mimeType: string;
    takenAt?: string | null;
    downloadUrl: string;
  };
  faceTags: PhotoFaceTagRecord[];
  insight?: PhotoInsightRecord | null;
  comments: MediaCommentRecord[];
  analysisJob?: PhotoAnalysisJobRecord | null;
  /** AI service (MediaPipe) reachable when true */
  aiEnabled: boolean;
  /** BullMQ photo-analysis queue; requires REDIS_URL */
  aiQueueAvailable: boolean;
}

export interface BulkTaggingMediaItem {
  id: string;
  title?: string | null;
  mimeType: string;
  takenAt?: string | null;
  untaggedFaceCount: number;
  taggedFaceCount: number;
  thumbnailUrl?: string | null;
}

export interface DetectedFaceDraft extends PhotoFaceBox {
  confidence: number;
  label?: string;
}

export interface AiPhotoDetectFacesResponse {
  faces: DetectedFaceDraft[];
  imageWidth?: number;
  imageHeight?: number;
}
