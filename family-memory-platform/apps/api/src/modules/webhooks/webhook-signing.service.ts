import { Injectable } from '@nestjs/common';
import { createHmac } from 'node:crypto';
import type { WebhookEventType } from '@family/shared';
import { webhookEventTypeToDot } from '@family/shared';

export interface SignedWebhookRequest {
  body: string;
  headers: Record<string, string>;
  timestamp: number;
}

@Injectable()
export class WebhookSigningService {
  buildSignedRequest(params: {
    secret: string;
    eventId: string;
    workspaceId: string;
    eventType: WebhookEventType;
    payload: Record<string, unknown>;
  }): SignedWebhookRequest {
    const timestamp = Math.floor(Date.now() / 1000);
    const envelope = {
      id: params.eventId,
      type: webhookEventTypeToDot(params.eventType),
      createdAt: new Date(timestamp * 1000).toISOString(),
      workspaceId: params.workspaceId,
      data: params.payload,
    };
    const body = this.stableStringify(envelope);
    const signedPayload = `${timestamp}.${body}`;
    const signature = createHmac('sha256', params.secret).update(signedPayload).digest('hex');

    return {
      body,
      timestamp,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'FamilyMemory-Webhooks/1.0',
        'X-Family-Event': webhookEventTypeToDot(params.eventType),
        'X-Family-Event-Id': params.eventId,
        'X-Family-Timestamp': String(timestamp),
        'X-Family-Signature': `sha256=${signature}`,
        'X-Family-Workspace-Id': params.workspaceId,
      },
    };
  }

  private stableStringify(value: unknown): string {
    return JSON.stringify(value, (_key, current) => {
      if (current && typeof current === 'object' && !Array.isArray(current)) {
        return Object.keys(current as Record<string, unknown>)
          .sort()
          .reduce<Record<string, unknown>>((acc, key) => {
            acc[key] = (current as Record<string, unknown>)[key];
            return acc;
          }, {});
      }
      return current;
    });
  }
}
