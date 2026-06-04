import { ForbiddenException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiAuditService } from '../privacy/ai-audit.service';
import { AiConsentService } from '../privacy/ai-consent.service';
import type {
  OcrPreviewDto,
  PhotoDetectFacesDto,
  PhotoImageContextDto,
  PhotoSuggestPersonDto,
  RelationshipSuggestDto,
  TimelineSummaryDto,
} from './ai.dto';

type AiFeature =
  | 'health'
  | 'matching.score-pair'
  | 'ocr.preview'
  | 'relationship.suggest'
  | 'timeline.summary'
  | 'photo.detect-faces'
  | 'photo.suggest-person'
  | 'photo.extract-context'
  | 'photo.estimate-period'
  | 'doc.ocr'
  | 'doc.extract-entities'
  | 'doc.suggest-events'
  | 'doc.suggest-relationships'
  | 'doc.summarize'
  | 'family-story.narrative'
  | 'story.person'
  | 'story.timeline-narrative'
  | 'story.document-summary'
  | 'story.family'
  | 'story.migration'
  | 'story.era-context';

export type AiRequestAudit = {
  userId: string;
  workspaceId?: string;
  scope?: Record<string, string>;
};

const CONSENT_EXEMPT_FEATURES: AiFeature[] = ['health'];

@Injectable()
export class AiService {
  constructor(
    private readonly config: ConfigService,
    private readonly aiAudit: AiAuditService,
    private readonly aiConsent: AiConsentService,
  ) {}

  health() {
    return this.request('health', 'GET', '/health');
  }

  ocrPreview(dto: OcrPreviewDto, audit?: AiRequestAudit) {
    return this.request('ocr.preview', 'POST', '/ocr/preview', dto, audit);
  }

  suggestRelationship(dto: RelationshipSuggestDto, audit?: AiRequestAudit) {
    return this.request('relationship.suggest', 'POST', '/relationship/suggest', {
      ...dto,
      candidates: dto.candidates ?? [],
    }, audit);
  }

  summarizeTimeline(dto: TimelineSummaryDto, audit?: AiRequestAudit) {
    return this.request('timeline.summary', 'POST', '/timeline/summary', {
      ...dto,
      events: dto.events ?? [],
      language: dto.language ?? 'ru',
    }, audit);
  }

  detectPhotoFaces(dto: PhotoDetectFacesDto, audit?: AiRequestAudit) {
    return this.request('photo.detect-faces', 'POST', '/photo/detect-faces', {
      mediaId: dto.mediaId,
      imageUrl: dto.imageUrl,
    }, audit);
  }

  suggestPhotoPerson(dto: PhotoSuggestPersonDto, audit?: AiRequestAudit) {
    return this.request('photo.suggest-person', 'POST', '/photo/suggest-person', dto, audit);
  }

  scorePersonPair(body: Record<string, unknown>, audit?: AiRequestAudit) {
    return this.request('matching.score-pair', 'POST', '/matching/score-pair', body, audit);
  }

  extractPhotoContext(dto: PhotoImageContextDto, audit?: AiRequestAudit) {
    return this.request('photo.extract-context', 'POST', '/photo/extract-context', dto, audit);
  }

  estimatePhotoPeriod(dto: PhotoImageContextDto, audit?: AiRequestAudit) {
    return this.request('photo.estimate-period', 'POST', '/photo/estimate-period', dto, audit);
  }

  /** PROMPT 7 — thin proxy to AI document intelligence routes */
  documentOcr(body: Record<string, unknown>, audit?: AiRequestAudit) {
    return this.request('doc.ocr', 'POST', '/document/ocr', body, audit);
  }

  documentExtractEntities(body: Record<string, unknown>, audit?: AiRequestAudit) {
    return this.request('doc.extract-entities', 'POST', '/document/extract-entities', body, audit);
  }

  documentSuggestEvents(body: Record<string, unknown>, audit?: AiRequestAudit) {
    return this.request('doc.suggest-events', 'POST', '/document/suggest-events', body, audit);
  }

  documentSuggestRelationships(body: Record<string, unknown>, audit?: AiRequestAudit) {
    return this.request('doc.suggest-relationships', 'POST', '/document/suggest-relationships', body, audit);
  }

  documentSummarize(body: Record<string, unknown>, audit?: AiRequestAudit) {
    return this.request('doc.summarize', 'POST', '/document/summarize', body, audit);
  }

  generateFamilyStoryNarrative(body: Record<string, unknown>, audit?: AiRequestAudit) {
    return this.request('family-story.narrative', 'POST', '/family-story/narrative', body, audit);
  }

  /** PROMPT 11 — AI Storytelling: thin proxy routes */
  storyPerson(body: Record<string, unknown>, audit?: AiRequestAudit) {
    return this.request('story.person', 'POST', '/story/person', body, audit);
  }

  storyTimelineNarrative(body: Record<string, unknown>, audit?: AiRequestAudit) {
    return this.request('story.timeline-narrative', 'POST', '/story/timeline-narrative', body, audit);
  }

  storyDocumentSummary(body: Record<string, unknown>, audit?: AiRequestAudit) {
    return this.request('story.document-summary', 'POST', '/story/document-summary', body, audit);
  }

  storyFamily(body: Record<string, unknown>, audit?: AiRequestAudit) {
    return this.request('story.family', 'POST', '/story/family', body, audit);
  }

  storyMigration(body: Record<string, unknown>, audit?: AiRequestAudit) {
    return this.request('story.migration', 'POST', '/story/migration', body, audit);
  }

  storyEraContext(body: Record<string, unknown>, audit?: AiRequestAudit) {
    return this.request('story.era-context', 'POST', '/story/era-context', body, audit);
  }

  isAiEnabled() {
    return this.isEnabled();
  }

  extractData<T>(result: unknown): T | null {
    if (result && typeof result === 'object' && 'data' in result) {
      const data = (result as { data?: unknown }).data;
      if (data != null) return data as T;
    }
    return null;
  }

  private async request(
    feature: AiFeature,
    method: 'GET' | 'POST',
    path: string,
    body?: unknown,
    audit?: AiRequestAudit,
  ) {
    if (!CONSENT_EXEMPT_FEATURES.includes(feature)) {
      if (!audit?.userId) {
        throw new ForbiddenException('Authenticated user context is required for AI processing.');
      }
      await this.aiConsent.assertLocalProcessingConsent(audit.userId);
    }

    if (!this.isEnabled()) {
      return this.disabled(feature);
    }

    const baseUrl = this.config.get<string>('AI_SERVICE_URL') ?? 'http://localhost:8000';

    try {
      await this.aiAudit.logOperation({
        feature,
        userId: audit?.userId,
        workspaceId: audit?.workspaceId,
        scope: audit?.scope,
      });

      const response = await fetch(`${baseUrl}${path}`, {
        method,
        headers: method === 'POST' ? { 'Content-Type': 'application/json' } : undefined,
        body: body === undefined ? undefined : JSON.stringify(body),
      });

      if (!response.ok) {
        throw new ServiceUnavailableException(`AI service ${response.status}: ${await response.text()}`);
      }

      return {
        enabled: true,
        feature,
        serviceUrl: baseUrl,
        data: await response.json(),
      };
    } catch (error) {
      if (error instanceof ServiceUnavailableException || error instanceof ForbiddenException) {
        throw error;
      }

      return {
        enabled: true,
        feature,
        status: 'unavailable',
        serviceUrl: baseUrl,
        message: error instanceof Error ? error.message : 'AI service is unavailable',
      };
    }
  }

  private isEnabled() {
    return this.config.get<string>('AI_SERVICE_ENABLED') === 'true';
  }

  private disabled(feature: AiFeature) {
    return {
      enabled: false,
      feature,
      status: 'disabled',
      message: 'AI service is optional and disabled. Set AI_SERVICE_ENABLED=true and enable docker compose profile ai.',
    };
  }
}
