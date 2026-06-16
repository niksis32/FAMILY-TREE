import { Injectable, NotFoundException } from '@nestjs/common';
import type { HintSource, HintStatus, HintSummary } from '@family/shared';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ProgressCalculatorService } from '../gamification/progress-calculator.service';

@Injectable()
export class HintsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly progress: ProgressCalculatorService,
  ) {}

  async list(status: HintStatus = 'OPEN', source?: HintSource, limit = 50): Promise<HintSummary[]> {
    await this.syncAdapters();
    const rows = await this.prisma.hint.findMany({
      where: {
        status,
        ...(source ? { source } : {}),
      },
      include: { reasons: true },
      orderBy: [{ score: 'desc' }, { updatedAt: 'desc' }],
      take: limit,
    });
    return rows.map((r) => this.toSummary(r));
  }

  async explain(id: string): Promise<HintSummary> {
    const row = await this.prisma.hint.findFirst({
      where: { id },
      include: { reasons: true },
    });
    if (!row) throw new NotFoundException('Hint not found');
    return this.toSummary(row);
  }

  async accept(id: string, userId: string) {
    const row = await this.prisma.hint.update({
      where: { id },
      data: {
        status: 'ACCEPTED',
        resolvedById: userId,
        resolvedAt: new Date(),
      },
      include: { reasons: true },
    });
    return this.toSummary(row);
  }

  async dismiss(id: string, userId: string) {
    const row = await this.prisma.hint.update({
      where: { id },
      data: {
        status: 'DISMISSED',
        resolvedById: userId,
        resolvedAt: new Date(),
      },
      include: { reasons: true },
    });
    return this.toSummary(row);
  }

  async syncAdapters() {
    await Promise.all([
      this.syncMatchingHints(),
      this.syncGapHints(),
    ]);
  }

  private async syncMatchingHints() {
    const candidates = await this.prisma.treeMatchCandidate.findMany({
      where: { status: { in: ['NEW', 'NEEDS_REVIEW'] } },
      orderBy: { score: 'desc' },
      take: 30,
      include: {
        sourcePerson: { select: { id: true, givenName: true, familyName: true, workspaceId: true } },
        targetPerson: { select: { id: true, givenName: true, familyName: true, workspaceId: true } },
      },
    });

    for (const c of candidates) {
      const workspaceId = c.sourcePerson.workspaceId;
      const sourceName = [c.sourcePerson.givenName, c.sourcePerson.familyName].filter(Boolean).join(' ');
      const targetName = [c.targetPerson.givenName, c.targetPerson.familyName].filter(Boolean).join(' ');
      const externalKey = `matching:${c.id}`;

      const existing = await this.prisma.hint.findFirst({
        where: {
          workspaceId,
          source: 'MATCHING',
          entityType: 'match_candidate',
          entityId: c.id,
          status: 'OPEN',
        },
      });
      if (existing) continue;

      const reasons = Array.isArray(c.reasons)
        ? (c.reasons as Array<{ code?: string; label?: string; weight?: number }>)
        : [];

      await this.prisma.hint.create({
        data: {
          workspaceId,
          source: 'MATCHING',
          entityType: 'match_candidate',
          entityId: c.id,
          targetEntityType: 'person',
          targetEntityId: c.targetPersonId,
          title: `Возможный дубликат: ${sourceName} ↔ ${targetName}`,
          summary: `Совпадение ${Math.round(c.score * 100)}% — требуется ручная проверка`,
          score: c.score,
          metadata: { externalKey, sourcePersonId: c.sourcePersonId, targetPersonId: c.targetPersonId },
          reasons: {
            create: reasons.length
              ? reasons.map((r) => ({
                  code: r.code ?? 'match.signal',
                  label: r.label ?? 'Сигнал совпадения',
                  weight: r.weight ?? 1,
                }))
              : [{ code: 'match.score', label: `Оценка совпадения ${c.score}`, weight: c.score }],
          },
        },
      });
    }
  }

  private async syncGapHints() {
    const workspaceMember = await this.prisma.workspaceMember.findFirst({
      select: { workspaceId: true },
    });
    if (!workspaceMember) return;

    const gaps = await this.progress.collectMissingDataGaps(20);
    for (const gap of gaps) {
      const existing = await this.prisma.hint.findFirst({
        where: {
          workspaceId: workspaceMember.workspaceId,
          source: 'GAPS',
          entityType: gap.entityType,
          entityId: gap.entityId,
          status: 'OPEN',
        },
      });
      if (existing) continue;

      await this.prisma.hint.create({
        data: {
          workspaceId: workspaceMember.workspaceId,
          source: 'GAPS',
          entityType: gap.entityType,
          entityId: gap.entityId,
          title: gap.entityLabel,
          summary: gap.hintKey,
          score: gap.severity === 'critical' ? 0.9 : gap.severity === 'high' ? 0.7 : 0.4,
          metadata: { code: gap.code, severity: gap.severity },
          reasons: {
            create: [{ code: gap.code, label: gap.hintKey, weight: 1, detail: { severity: gap.severity } }],
          },
        },
      });
    }
  }

  private toSummary(row: {
    id: string;
    source: HintSource;
    status: string;
    entityType: string;
    entityId: string;
    targetEntityType: string | null;
    targetEntityId: string | null;
    title: string;
    summary: string | null;
    score: number;
    createdAt: Date;
    updatedAt: Date;
    reasons: Array<{ code: string; label: string; weight: number; detail: Prisma.JsonValue | null }>;
  }): HintSummary {
    return {
      id: row.id,
      source: row.source,
      status: row.status as HintStatus,
      entityType: row.entityType,
      entityId: row.entityId,
      targetEntityType: row.targetEntityType,
      targetEntityId: row.targetEntityId,
      title: row.title,
      summary: row.summary,
      score: row.score,
      reasons: row.reasons.map((r) => ({
        code: r.code,
        label: r.label,
        weight: r.weight,
        detail: (r.detail ?? undefined) as Record<string, unknown> | undefined,
      })),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
