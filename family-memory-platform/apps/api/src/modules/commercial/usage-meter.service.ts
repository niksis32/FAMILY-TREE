import { ForbiddenException, Injectable } from '@nestjs/common';
import type { PlanEntitlements, WorkspaceUsageSnapshot } from '@family/shared';
import { UsageMetric } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CommercialContextService } from './commercial-context.service';

@Injectable()
export class UsageMeterService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly context: CommercialContextService,
  ) {}

  private periodStart() {
    const d = new Date();
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
  }

  async syncWorkspaceUsage(workspaceId: string, entitlements: PlanEntitlements) {
    const periodStart = this.periodStart();

    const families = await this.prisma.family.count({
      where: { workspaceId, deletedAt: null },
    });
    const familyIds = await this.prisma.family.findMany({
      where: { workspaceId, deletedAt: null },
      select: { id: true },
    });
    const persons = await this.prisma.familyMember.count({
      where: {
        familyId: { in: familyIds.map((f) => f.id) },
        deletedAt: null,
      },
    });

    const mediaAgg = await this.prisma.media.aggregate({
      _sum: { sizeBytes: true },
      where: { workspaceId, deletedAt: null },
    });
    const mediaBytes = BigInt(mediaAgg._sum?.sizeBytes ?? 0);

    const limits: { metric: UsageMetric; used: bigint; limit: bigint }[] = [
      { metric: 'FAMILIES', used: BigInt(families), limit: BigInt(entitlements.maxFamilies) },
      { metric: 'PERSONS', used: BigInt(persons), limit: BigInt(entitlements.maxPersons) },
      { metric: 'MEDIA_BYTES', used: mediaBytes, limit: BigInt(entitlements.maxMediaBytes) },
      {
        metric: 'AI_CREDITS',
        used: await this.readUsed(workspaceId, 'AI_CREDITS', periodStart),
        limit: BigInt(entitlements.aiCreditsPerMonth),
      },
      {
        metric: 'GEDCOM_EXPORTS',
        used: await this.readUsed(workspaceId, 'GEDCOM_EXPORTS', periodStart),
        limit: BigInt(entitlements.maxGedcomExportsPerMonth),
      },
      {
        metric: 'REPORT_EXPORTS',
        used: await this.readUsed(workspaceId, 'REPORT_EXPORTS', periodStart),
        limit: BigInt(entitlements.maxReportExportsPerMonth),
      },
    ];

    for (const row of limits) {
      await this.prisma.usageLimit.upsert({
        where: {
          workspaceId_metric_periodStart: {
            workspaceId,
            metric: row.metric,
            periodStart,
          },
        },
        create: {
          workspaceId,
          metric: row.metric,
          used: row.used,
          limitValue: row.limit,
          periodStart,
        },
        update: {
          used: row.used,
          limitValue: row.limit,
        },
      });
    }
  }

  private async readUsed(workspaceId: string, metric: UsageMetric, periodStart: Date) {
    const row = await this.prisma.usageLimit.findUnique({
      where: {
        workspaceId_metric_periodStart: { workspaceId, metric, periodStart },
      },
    });
    return row?.used ?? BigInt(0);
  }

  async getUsageSnapshots(workspaceId: string): Promise<WorkspaceUsageSnapshot[]> {
    const periodStart = this.periodStart();
    const rows = await this.prisma.usageLimit.findMany({
      where: { workspaceId, periodStart },
    });
    return rows.map((r) => {
      const limit = Number(r.limitValue);
      const used = Number(r.used);
      const percentUsed = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
      return {
        metric: r.metric,
        used: r.used.toString(),
        limit: r.limitValue.toString(),
        percentUsed,
      };
    });
  }

  async assertWithinLimit(workspaceId: string, userId: string, metric: UsageMetric, increment = 1n) {
    const ctx = await this.context.resolveForUser(workspaceId, userId);
    await this.syncWorkspaceUsage(workspaceId, ctx.entitlements);

    const periodStart = this.periodStart();
    const row = await this.prisma.usageLimit.findUnique({
      where: {
        workspaceId_metric_periodStart: { workspaceId, metric, periodStart },
      },
    });
    if (!row) return;

    const next = row.used + increment;
    if (next > row.limitValue) {
      throw new ForbiddenException(`Usage limit exceeded for ${metric}`);
    }
  }

  async increment(workspaceId: string, metric: UsageMetric, amount = 1n) {
    const periodStart = this.periodStart();
    await this.prisma.usageLimit.update({
      where: {
        workspaceId_metric_periodStart: { workspaceId, metric, periodStart },
      },
      data: { used: { increment: amount } },
    });
  }
}
