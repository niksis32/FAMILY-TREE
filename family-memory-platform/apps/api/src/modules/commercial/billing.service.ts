import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CommercialPlansService } from './commercial-plans.service';

@Injectable()
export class BillingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly plans: CommercialPlansService,
  ) {}

  /** Provisions billing account + FREE subscription for a new workspace. */
  async provisionWorkspace(workspaceId: string, billingEmail?: string | null) {
    await this.plans.seedPlansIfEmpty();
    const freePlan = await this.plans.findPlanByCode('FREE');
    if (!freePlan) throw new Error('FREE plan missing — run commercial seed');

    await this.prisma.billingAccount.upsert({
      where: { workspaceId },
      create: {
        workspaceId,
        billingEmail: billingEmail ?? undefined,
        status: 'ACTIVE',
      },
      update: {
        billingEmail: billingEmail ?? undefined,
      },
    });

    await this.prisma.workspaceSubscription.upsert({
      where: { workspaceId },
      create: {
        workspaceId,
        planId: freePlan.id,
        status: 'ACTIVE',
      },
      update: {},
    });
  }

  async updateBillingEmail(workspaceId: string, billingEmail: string) {
    return this.prisma.billingAccount.update({
      where: { workspaceId },
      data: { billingEmail },
    });
  }

  async changePlan(workspaceId: string, planCode: string) {
    const plan = await this.plans.findPlanByCode(planCode);
    if (!plan) throw new Error(`Unknown plan: ${planCode}`);

    return this.prisma.workspaceSubscription.update({
      where: { workspaceId },
      data: {
        planId: plan.id,
        status: 'ACTIVE',
        cancelledAt: null,
      },
      include: { plan: true },
    });
  }
}
