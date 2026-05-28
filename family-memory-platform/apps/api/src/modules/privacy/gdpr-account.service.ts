import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PrivacyAuditService } from './privacy-audit.service';

/**
 * GDPR account deletion — cascade soft-delete and PII anonymization.
 * MinIO object purge is scheduled/async (not blocking HTTP).
 */
@Injectable()
export class GdprAccountService {
  private readonly logger = new Logger(GdprAccountService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: PrivacyAuditService,
  ) {}

  async processDeleteRequest(userId: string, requestId: string) {
    await this.prisma.privacyRequest.update({
      where: { id: requestId },
      data: { status: 'PROCESSING' },
    });

    const ownedWorkspaces = await this.prisma.workspaceMember.findMany({
      where: { userId, role: 'OWNER' },
      select: { workspaceId: true },
    });

    for (const { workspaceId } of ownedWorkspaces) {
      await this.softDeleteWorkspace(workspaceId);
    }

    await this.prisma.publicShare.updateMany({
      where: { createdById: userId, tokenRevokedAt: null },
      data: { tokenRevokedAt: new Date() },
    });

    await this.prisma.matchProfile.deleteMany({ where: { userId } }).catch(() => undefined);
    await this.prisma.userConsent.deleteMany({ where: { userId } });

    const anonymizedEmail = `deleted-${userId}@anonymized.local`;
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        email: anonymizedEmail,
        displayName: 'Deleted User',
        passwordHash: '',
        isActive: false,
        deletedAt: new Date(),
      },
    });

    await this.audit.logAudit({
      userId,
      action: 'privacy.account.deleted',
      entityType: 'User',
      entityId: userId,
      payload: { requestId, workspacesSoftDeleted: ownedWorkspaces.length },
    });

    await this.prisma.privacyRequest.update({
      where: { id: requestId },
      data: { status: 'COMPLETED', completedAt: new Date() },
    });

    this.logger.log(`GDPR delete completed for user ${userId}, request ${requestId}`);
    return { status: 'COMPLETED' as const };
  }

  private async softDeleteWorkspace(workspaceId: string) {
    await this.prisma.family.updateMany({
      where: { workspaceId, deletedAt: null },
      data: { deletedAt: new Date() },
    });

    await this.prisma.workspaceInvite.updateMany({
      where: { workspaceId, status: 'PENDING' },
      data: { status: 'REVOKED' },
    });

    await this.prisma.publicShare.updateMany({
      where: { workspaceId, tokenRevokedAt: null },
      data: { tokenRevokedAt: new Date() },
    });
  }
}
