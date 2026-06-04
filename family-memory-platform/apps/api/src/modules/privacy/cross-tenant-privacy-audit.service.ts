import { Injectable } from '@nestjs/common';
import type {
  CrossTenantAuditFinding,
  CrossTenantPrivacyAuditReport,
} from '@family/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { PrivacyAuditService } from './privacy-audit.service';

const SAMPLE_LIMIT = 8;

@Injectable()
export class CrossTenantPrivacyAuditService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: PrivacyAuditService,
  ) {}

  async runAudit(params: {
    workspaceId?: string;
    userId?: string;
  }): Promise<CrossTenantPrivacyAuditReport> {
    const scope = params.workspaceId ? 'workspace' : 'platform';
    const findings: CrossTenantAuditFinding[] = [];

    findings.push(
      ...(await this.findCrossWorkspacePrivateCandidates(params.workspaceId)),
      ...(await this.findPrivateInOptedInPool(params.workspaceId)),
      ...(await this.findPersonFamilyWorkspaceMismatch(params.workspaceId)),
      ...(await this.findPrivatePersonsInSearchPool(params.workspaceId)),
    );

    const summary = this.summarize(findings);
    const passed = summary.critical === 0 && summary.high === 0;
    const recommendations = this.buildRecommendations(findings);

    const report: CrossTenantPrivacyAuditReport = {
      generatedAt: new Date().toISOString(),
      scope,
      workspaceId: params.workspaceId,
      passed,
      summary,
      findings,
      recommendations,
    };

    await this.audit.logAudit({
      userId: params.userId,
      workspaceId: params.workspaceId,
      action: 'CROSS_TENANT_PRIVACY_AUDIT',
      entityType: 'PrivacyAudit',
      payload: {
        passed,
        scope,
        summary,
        findingCodes: findings.map((f) => f.code),
      },
    });

    return report;
  }

  private async findCrossWorkspacePrivateCandidates(
    workspaceId?: string,
  ): Promise<CrossTenantAuditFinding[]> {
    const rows = await this.prisma.treeMatchCandidate.findMany({
      where: workspaceId
        ? {
            OR: [{ sourceWorkspaceId: workspaceId }, { targetWorkspaceId: workspaceId }],
          }
        : undefined,
      select: {
        id: true,
        sourceWorkspaceId: true,
        targetWorkspaceId: true,
        sourcePerson: { select: { id: true, privacyLevel: true } },
        targetPerson: { select: { id: true, privacyLevel: true } },
      },
      take: 500,
    });

    const leaked = rows.filter(
      (r) =>
        r.sourceWorkspaceId !== r.targetWorkspaceId &&
        (r.sourcePerson.privacyLevel === 'PRIVATE' || r.targetPerson.privacyLevel === 'PRIVATE'),
    );

    if (!leaked.length) return [];

    return [
      {
        code: 'CROSS_WORKSPACE_PRIVATE_CANDIDATE',
        severity: 'CRITICAL',
        message:
          'Match candidates link PRIVATE persons across workspaces — violates cross-tenant privacy policy.',
        count: leaked.length,
        sampleIds: leaked.slice(0, SAMPLE_LIMIT).map((r) => r.id),
        workspaceIds: [
          ...new Set(leaked.flatMap((r) => [r.sourceWorkspaceId, r.targetWorkspaceId])),
        ].slice(0, SAMPLE_LIMIT),
      },
    ];
  }

  private async findPrivateInOptedInPool(workspaceId?: string): Promise<CrossTenantAuditFinding[]> {
    const optedIn = await this.prisma.matchProfile.findMany({
      where: { isOptedIn: true },
      select: { userId: true },
    });
    if (!optedIn.length) return [];

    const memberWorkspaces = await this.prisma.workspaceMember.findMany({
      where: {
        userId: { in: optedIn.map((p) => p.userId) },
        ...(workspaceId ? { workspaceId } : {}),
      },
      select: { workspaceId: true },
    });
    const workspaceIds = [...new Set(memberWorkspaces.map((m) => m.workspaceId))];
    if (!workspaceIds.length) return [];

    const privatePersons = await this.prisma.person.findMany({
      where: {
        workspaceId: { in: workspaceIds },
        privacyLevel: 'PRIVATE',
        deletedAt: null,
      },
      select: { id: true, workspaceId: true },
      take: 200,
    });

    if (!privatePersons.length) return [];

    return [
      {
        code: 'PRIVATE_PERSON_OPTED_IN_POOL',
        severity: 'HIGH',
        message:
          'PRIVATE persons exist in workspaces with Global Matching opt-in — exclude them from match index and blocking.',
        count: privatePersons.length,
        sampleIds: privatePersons.slice(0, SAMPLE_LIMIT).map((p) => p.id),
        workspaceIds: [...new Set(privatePersons.map((p) => p.workspaceId))].slice(0, SAMPLE_LIMIT),
      },
    ];
  }

  private async findPersonFamilyWorkspaceMismatch(
    workspaceId?: string,
  ): Promise<CrossTenantAuditFinding[]> {
    const members = await this.prisma.familyMember.findMany({
      where: {
        deletedAt: null,
        family: { deletedAt: null },
        ...(workspaceId ? { person: { workspaceId } } : {}),
      },
      include: {
        person: { select: { id: true, workspaceId: true } },
        family: { select: { workspaceId: true } },
      },
      take: 300,
    });

    const mismatched = members.filter(
      (m) => m.family.workspaceId && m.person.workspaceId !== m.family.workspaceId,
    );

    if (!mismatched.length) return [];

    return [
      {
        code: 'PERSON_FAMILY_WORKSPACE_MISMATCH',
        severity: 'MEDIUM',
        message: 'Person.workspaceId differs from family workspace — row-level isolation risk.',
        count: mismatched.length,
        sampleIds: mismatched.slice(0, SAMPLE_LIMIT).map((m) => m.person.id),
        workspaceIds: [...new Set(mismatched.map((m) => m.person.workspaceId))].slice(0, SAMPLE_LIMIT),
      },
    ];
  }

  private async findPrivatePersonsInSearchPool(
    workspaceId?: string,
  ): Promise<CrossTenantAuditFinding[]> {
    const count = await this.prisma.person.count({
      where: {
        deletedAt: null,
        privacyLevel: 'PRIVATE',
        ...(workspaceId ? { workspaceId } : {}),
      },
    });

    if (!count) return [];

    return [
      {
        code: 'SEARCH_REINDEX_PRIVATE_PERSONS',
        severity: 'LOW',
        message:
          'PRIVATE persons in DB — Meilisearch reindex should exclude them from the global search index.',
        count,
      },
    ];
  }

  private summarize(findings: CrossTenantAuditFinding[]) {
    const summary = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
    for (const f of findings) {
      if (f.severity === 'CRITICAL') summary.critical += 1;
      else if (f.severity === 'HIGH') summary.high += 1;
      else if (f.severity === 'MEDIUM') summary.medium += 1;
      else if (f.severity === 'LOW') summary.low += 1;
      else summary.info += 1;
    }
    return summary;
  }

  private buildRecommendations(findings: CrossTenantAuditFinding[]): string[] {
    const codes = new Set(findings.map((f) => f.code));
    const tips: string[] = [];

    if (codes.has('CROSS_WORKSPACE_PRIVATE_CANDIDATE')) {
      tips.push('Reject or purge affected TreeMatchCandidate rows; re-run matching after privacy fix.');
    }
    if (codes.has('PRIVATE_PERSON_OPTED_IN_POOL')) {
      tips.push('Keep PRIVATE persons out of match index; use FAMILY/PUBLIC for cross-tree discovery.');
    }
    if (codes.has('PERSON_FAMILY_WORKSPACE_MISMATCH')) {
      tips.push('Align Person.workspaceId with Family.workspaceId via data fix migration.');
    }
    if (codes.has('SEARCH_REINDEX_PRIVATE_PERSONS')) {
      tips.push('PRIVATE persons are excluded from POST /search/reindex document build.');
    }
    if (!tips.length) {
      tips.push('No cross-tenant privacy violations detected in this audit scope.');
    }

    return tips;
  }
}
