import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { OcrPreviewDto, RelationshipSuggestDto, TimelineSummaryDto } from './ai.dto';

type AiFeature = 'health' | 'ocr.preview' | 'relationship.suggest' | 'timeline.summary';

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
