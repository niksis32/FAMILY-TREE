import { Injectable } from '@nestjs/common';
import type { WorkspaceCommercialOverview, WorkspaceMemberSummary } from '@family/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { WorkspacesService } from '../workspaces/workspaces.service';
import { BillingService } from './billing.service';
import { CommercialContextService } from './commercial-context.service';
import { CommercialPlansService } from './commercial-plans.service';
import { UsageMeterService } from './usage-meter.service';
import { CommercialAuditService } from './commercial-audit.service';

@Injectable()
export class CommercialService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workspaces: WorkspacesService,
    private readonly billing: BillingService,
    private readonly plans: CommercialPlansService,
    private readonly context: CommercialContextService,
    private readonly usage: UsageMeterService,
    private readonly audit: CommercialAuditService,
  ) {}

  async listAuditLogs(workspaceId: string, userId: string) {
    await this.context.resolveForUser(workspaceId, userId);
    return this.audit.listForWorkspace(workspaceId);
  }

  async listMyWorkspaces(userId: string) {
    const members = await this.prisma.workspaceMember.findMany({
      where: { userId },
      include: { workspace: { include: { tenant: true } } },
      orderBy: { createdAt: 'asc' },
    });
    return members.map((m) => ({
      id: m.workspace.id,
      name: m.workspace.name,
      tenantName: m.workspace.tenant.name,
      role: m.role,
      isDefault: m.workspace.isDefault,
    }));
  }

  async ensurePrimaryWorkspace(userId: string, email: string) {
    const workspace = await this.workspaces.ensureDefaultWorkspace(userId);
    await this.billing.provisionWorkspace(workspace.id, email);
    return workspace;
  }

  async getOverview(workspaceId: string, userId: string): Promise<WorkspaceCommercialOverview> {
    const ctx = await this.context.resolveForUser(workspaceId, userId);
    await this.usage.syncWorkspaceUsage(workspaceId, ctx.entitlements);

    const workspace = await this.prisma.workspace.findUniqueOrThrow({
      where: { id: workspaceId },
      include: {
        billingAccount: true,
        subscription: { include: { plan: true } },
        featureFlags: { where: { enabled: true } },
      },
    });

    const plan = workspace.subscription?.plan;
    const enabledFeatures = [
      ...Object.entries(ctx.entitlements.features)
        .filter(([, v]) => v)
        .map(([k]) => k),
      ...workspace.featureFlags.map((f) => f.key),
    ];

    return {
      workspaceId,
      workspaceName: workspace.name,
      memberRole: ctx.memberRole,
      plan: {
        id: plan?.id ?? '',
        code: plan?.code ?? 'FREE',
        name: plan?.name ?? 'Free',
        description: plan?.description ?? null,
        entitlements: ctx.entitlements,
        sortOrder: plan?.sortOrder ?? 0,
      },
      subscriptionStatus: workspace.subscription?.status ?? 'ACTIVE',
      billingAccountStatus: workspace.billingAccount?.status ?? 'ACTIVE',
      billingEmail: workspace.billingAccount?.billingEmail ?? null,
      usage: await this.usage.getUsageSnapshots(workspaceId),
      enabledFeatures: [...new Set(enabledFeatures)],
    };
  }

  async listMembers(workspaceId: string, userId: string): Promise<WorkspaceMemberSummary[]> {
    await this.context.resolveForUser(workspaceId, userId);
    const members = await this.prisma.workspaceMember.findMany({
      where: { workspaceId },
      include: { user: true },
      orderBy: { createdAt: 'asc' },
    });
    return members.map((m) => ({
      id: m.id,
      userId: m.userId,
      email: m.user.email,
      displayName: m.user.displayName,
      role: m.role,
      joinedAt: m.createdAt.toISOString(),
    }));
  }

  async changePlan(workspaceId: string, userId: string, planCode: string) {
    await this.context.assertOwner(workspaceId, userId);
    await this.billing.changePlan(workspaceId, planCode);
    return this.getOverview(workspaceId, userId);
  }

  async updateBillingEmail(workspaceId: string, userId: string, billingEmail: string) {
    await this.context.assertOwner(workspaceId, userId);
    await this.billing.updateBillingEmail(workspaceId, billingEmail);
    return this.getOverview(workspaceId, userId);
  }

  listPlans() {
    return this.plans.listActivePlans();
  }
}
