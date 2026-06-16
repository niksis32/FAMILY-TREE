import { Injectable, Logger } from '@nestjs/common';
import { WEBHOOK_MATCH_MIN_SCORE } from '@family/shared';
import { WebhookEmitterService } from './webhook-emitter.service';

@Injectable()
export class WebhookDomainHooksService {
  private readonly logger = new Logger(WebhookDomainHooksService.name);

  constructor(private readonly emitter: WebhookEmitterService) {}

  async onMediaUploaded(params: {
    workspaceId: string;
    mediaId: string;
    title: string | null;
    mimeType: string;
    personId: string | null;
  }) {
    await this.safeEmit({
      workspaceId: params.workspaceId,
      eventType: 'MEDIA_UPLOADED',
      entityType: 'media',
      entityId: params.mediaId,
      data: {
        mediaId: params.mediaId,
        title: params.title,
        mimeType: params.mimeType,
        personId: params.personId,
        url: `/media/${params.mediaId}`,
      },
    });
  }

  async onStoryPublished(params: {
    workspaceId: string;
    storyId: string;
    title: string;
    slug: string | null;
    visibility: string;
  }) {
    await this.safeEmit({
      workspaceId: params.workspaceId,
      eventType: 'STORY_PUBLISHED',
      entityType: 'family_story',
      entityId: params.storyId,
      idempotencyKey: `story-published:${params.storyId}`,
      data: {
        storyId: params.storyId,
        title: params.title,
        slug: params.slug,
        visibility: params.visibility,
        url: params.slug ? `/stories/${params.slug}` : `/stories/${params.storyId}`,
      },
    });
  }

  async onMatchFound(params: {
    workspaceId: string;
    candidateId: string;
    sourcePersonId: string;
    targetPersonId: string;
    score: number;
    status: string;
  }) {
    if (params.score < WEBHOOK_MATCH_MIN_SCORE) return;
    await this.safeEmit({
      workspaceId: params.workspaceId,
      eventType: 'MATCH_FOUND',
      entityType: 'tree_match_candidate',
      entityId: params.candidateId,
      idempotencyKey: `match:${params.sourcePersonId}:${params.targetPersonId}`,
      data: {
        candidateId: params.candidateId,
        sourcePersonId: params.sourcePersonId,
        targetPersonId: params.targetPersonId,
        score: params.score,
        status: params.status,
        url: `/matching/candidates/${params.candidateId}`,
      },
    });
  }

  async onMessageCreated(params: {
    workspaceId: string;
    conversationId: string;
    messageId: string;
    senderId: string;
    bodyPreview: string;
  }) {
    await this.safeEmit({
      workspaceId: params.workspaceId,
      eventType: 'MESSAGE_CREATED',
      entityType: 'message',
      entityId: params.messageId,
      data: {
        messageId: params.messageId,
        conversationId: params.conversationId,
        senderId: params.senderId,
        bodyPreview: params.bodyPreview,
        url: `/messages?conversation=${params.conversationId}`,
      },
    });
  }

  private async safeEmit(params: Parameters<WebhookEmitterService['emit']>[0]) {
    try {
      await this.emitter.emit(params);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Webhook hook failed';
      this.logger.warn(`Webhook hook skipped (${params.eventType}): ${message}`);
    }
  }
}
