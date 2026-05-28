import { Injectable, OnModuleInit } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { SubscriptionPlanSummary } from '@family/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { PLAN_ENTITLEMENTS, PLAN_LABELS } from './commercial.constants';

@Injectable()
export class CommercialPlansService implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await this.seedPlansIfEmpty();
  }

  async seedPlansIfEmpty() {
    const count = await this.prisma.subscriptionPlan.count();
    if (count > 0) return;

    const codes = Object.keys(PLAN_ENTITLEMENTS) as (keyof typeof PLAN_ENTITLEMENTS)[];
    let sortOrder = 0;
    for (const code of codes) {
      const label = PLAN_LABELS[code];
      await this.prisma.subscriptionPlan.create({
        data: {
          code,
          name: label.name,
          description: label.description,
          entitlements: PLAN_ENTITLEMENTS[code] as unknown as Prisma.InputJsonValue,
          sortOrder: sortOrder++,
        },
      });
    }
  }

  async listActivePlans(): Promise<SubscriptionPlanSummary[]> {
    await this.seedPlansIfEmpty();
    const plans = await this.prisma.subscriptionPlan.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
    return plans.map((p) => ({
      id: p.id,
      code: p.code,
      name: p.name,
      description: p.description,
      entitlements: p.entitlements as unknown as SubscriptionPlanSummary['entitlements'],
      sortOrder: p.sortOrder,
    }));
  }

  async findPlanByCode(code: string) {
    await this.seedPlansIfEmpty();
    return this.prisma.subscriptionPlan.findUnique({ where: { code: code as never } });
  }
}
