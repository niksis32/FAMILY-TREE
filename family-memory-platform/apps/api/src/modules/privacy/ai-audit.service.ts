import { Injectable } from '@nestjs/common';
import { PrivacyAuditService } from './privacy-audit.service';

export interface AiAuditParams {
  feature: string;
  userId?: string;
  workspaceId?: string;
  scope?: { personId?: string; familyId?: string; documentId?: string; mediaId?: string };
  ip?: string;
}

@Injectable()
export class AiAuditService {
  constructor(private readonly audit: PrivacyAuditService) {}

  async logOperation(params: AiAuditParams) {
    await this.audit.logAudit({
      userId: params.userId,
      workspaceId: params.workspaceId,
      action: `ai.${params.feature}`,
      entityType: 'AiOperation',
      entityId: params.scope?.personId ?? params.scope?.documentId ?? params.scope?.mediaId,
      payload: {
        feature: params.feature,
        scope: params.scope ?? null,
      },
      ip: params.ip,
    });

    await this.audit.logAccess({
      workspaceId: params.workspaceId,
      userId: params.userId,
      resourceType: 'ai',
      resourceId: params.feature,
      action: 'AI_INFERENCE',
      ip: params.ip,
      metadata: { scope: params.scope ?? null },
    });
  }
}
