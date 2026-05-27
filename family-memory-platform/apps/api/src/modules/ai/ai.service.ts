import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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
  | 'family-story.narrative';

@Injectable()
export class AiService {
  constructor(private readonly config: ConfigService) {}

  health() {
    return this.request('health', 'GET', '/health');
  }

  ocrPreview(dto: OcrPreviewDto) {
    return this.request('ocr.preview', 'POST', '/ocr/preview', dto);
  }

  suggestRelationship(dto: RelationshipSuggestDto) {
    return this.request('relationship.suggest', 'POST', '/relationship/suggest', {
      ...dto,
      candidates: dto.candidates ?? [],
    });
  }

  summarizeTimeline(dto: TimelineSummaryDto) {
    return this.request('timeline.summary', 'POST', '/timeline/summary', {
      ...dto,
      events: dto.events ?? [],
      language: dto.language ?? 'ru',
    });
  }

  detectPhotoFaces(dto: PhotoDetectFacesDto) {
    return this.request('photo.detect-faces', 'POST', '/photo/detect-faces', {
      mediaId: dto.mediaId,
      imageUrl: dto.imageUrl,
    });
  }

  suggestPhotoPerson(dto: PhotoSuggestPersonDto) {
    return this.request('photo.suggest-person', 'POST', '/photo/suggest-person', dto);
  }

  extractPhotoContext(dto: PhotoImageContextDto) {
    return this.request('photo.extract-context', 'POST', '/photo/extract-context', dto);
  }

  estimatePhotoPeriod(dto: PhotoImageContextDto) {
    return this.request('photo.estimate-period', 'POST', '/photo/estimate-period', dto);
  }

  /** PROMPT 7 — thin proxy to AI document intelligence routes */
  documentOcr(body: Record<string, unknown>) {
    return this.request('doc.ocr', 'POST', '/document/ocr', body);
  }

  documentExtractEntities(body: Record<string, unknown>) {
    return this.request('doc.extract-entities', 'POST', '/document/extract-entities', body);
  }

  documentSuggestEvents(body: Record<string, unknown>) {
    return this.request('doc.suggest-events', 'POST', '/document/suggest-events', body);
  }

  documentSuggestRelationships(body: Record<string, unknown>) {
    return this.request('doc.suggest-relationships', 'POST', '/document/suggest-relationships', body);
  }

  documentSummarize(body: Record<string, unknown>) {
    return this.request('doc.summarize', 'POST', '/document/summarize', body);
  }

  generateFamilyStoryNarrative(body: Record<string, unknown>) {
    return this.request('family-story.narrative', 'POST', '/family-story/narrative', body);
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

  private async request(feature: AiFeature, method: 'GET' | 'POST', path: string, body?: unknown) {
    if (!this.isEnabled()) {
      return this.disabled(feature);
    }

    const baseUrl = this.config.get<string>('AI_SERVICE_URL') ?? 'http://localhost:8000';

    try {
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
      if (error instanceof ServiceUnavailableException) {
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
