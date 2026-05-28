import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { PlanEntitlements } from '@family/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { PLAN_ENTITLEMENTS } from './commercial.constants';

export interface ResolvedCommercialContext {
  workspaceId: string;
  memberRole: 'OWNER' | 'EDITOR' | 'VIEWER';
  planCode: keyof typeof PLAN_ENTITLEMENTS;
  entitlements: PlanEntitlements;
  subscriptionStatus: string;
}

@Injectable()
export class CommercialContextService {
  constructor(private readonly prisma: PrismaService) {}

  async resolveForUser(workspaceId: string, userId: string): Promise<ResolvedCommercialContext> {
    const member = await this.prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
      include: {
        workspace: {
          include: {
            subscription: { include: { plan: true } },
          },
        },
      },
    });
    if (!member) {
      throw new ForbiddenException('Not a member of this workspace');
    }

    const planCode = (member.workspace.subscription?.plan.code ?? 'FREE') as keyof typeof PLAN_ENTITLEMENTS;
    const entitlements =
      (member.workspace.subscription?.plan.entitlements as PlanEntitlements | null) ??
      PLAN_ENTITLEMENTS[planCode] ??
      PLAN_ENTITLEMENTS.FREE;

    return {
      workspaceId,
      memberRole: member.role,
      planCode,
      entitlements,
      subscriptionStatus: member.workspace.subscription?.status ?? 'ACTIVE',
    };
  }

  async assertOwner(workspaceId: string, userId: string) {
    const ctx = await this.resolveForUser(workspaceId, userId);
    if (ctx.memberRole !== 'OWNER') {
      throw new ForbiddenException('Workspace owner role required');
    }
    return ctx;
  }

  async assertFeature(workspaceId: string, userId: string, featureKey: keyof PlanEntitlements['features']) {
    const ctx = await this.resolveForUser(workspaceId, userId);
    const override = await this.prisma.featureFlag.findFirst({
      where: {
        key: featureKey,
        enabled: true,
        OR: [
          { scope: 'GLOBAL' },
          { scope: 'WORKSPACE', workspaceId },
          { scope: 'USER', userId },
        ],
      },
    });
    if (override) return ctx;
    if (!ctx.entitlements.features[featureKey]) {
      throw new ForbiddenException(`Feature "${featureKey}" is not included in plan ${ctx.planCode}`);
    }
    return ctx;
  }

  async getWorkspaceOrThrow(workspaceId: string) {
    const workspace = await this.prisma.workspace.findUnique({ where: { id: workspaceId } });
    if (!workspace) throw new NotFoundException('Workspace not found');
    return workspace;
  }
}
