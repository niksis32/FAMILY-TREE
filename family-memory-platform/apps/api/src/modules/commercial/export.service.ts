import { Injectable } from '@nestjs/common';
import { UsageMetric } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CommercialContextService } from './commercial-context.service';
import { UsageMeterService } from './usage-meter.service';
import { CommercialAuditService } from './commercial-audit.service';

@Injectable()
export class ExportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly context: CommercialContextService,
    private readonly usage: UsageMeterService,
    private readonly audit: CommercialAuditService,
  ) {}

  async exportGdprBundle(workspaceId: string, userId: string) {
    await this.context.resolveForUser(workspaceId, userId);

    const families = await this.prisma.family.findMany({
      where: { workspaceId, deletedAt: null },
      include: {
        members: {
          where: { deletedAt: null },
          include: { person: true },
        },
      },
    });

    const persons = families.flatMap((f) =>
      f.members.map((m) => ({
        id: m.person.id,
        givenName: m.person.givenName,
        familyName: m.person.familyName,
        birthDate: m.person.birthDate,
        deathDate: m.person.deathDate,
        privacyLevel: m.person.privacyLevel,
      })),
    );

    await this.audit.log({
      workspaceId,
      userId,
      action: 'export.gdpr.bundle',
      entityType: 'Workspace',
      entityId: workspaceId,
      payload: { persons: persons.length, families: families.length },
    });

    return {
      exportedAt: new Date().toISOString(),
      workspaceId,
      families: families.map((f) => ({ id: f.id, name: f.name })),
      persons,
      mediaManifest: [],
      documentsManifest: [],
      note: 'GDPR export bundle — media binary URLs are not included in MVP foundation.',
    };
  }

  async exportGedcom(workspaceId: string, userId: string, familyId: string) {
    const ctx = await this.context.resolveForUser(workspaceId, userId);
    await this.usage.assertWithinLimit(workspaceId, userId, UsageMetric.GEDCOM_EXPORTS);
    const advanced = ctx.entitlements.features.gedcomAdvanced;

    const family = await this.prisma.family.findFirst({
      where: { id: familyId, workspaceId, deletedAt: null },
      include: {
        members: {
          where: { deletedAt: null },
          include: { person: true },
        },
      },
    });
    if (!family) {
      return { error: 'Family not found in workspace' };
    }

    const lines: string[] = [
      '0 HEAD',
      '1 SOUR Family Memory Platform',
      '1 GEDC',
      '2 VERS 5.5',
      '0 @F1@ FAM',
      `1 NAME ${family.name ?? 'Family'}`,
    ];

    let indi = 1;
    for (const member of family.members) {
      const p = member.person;
      const xref = `@I${indi}@`;
      lines.push(`0 ${xref} INDI`);
      lines.push(`1 NAME ${p.givenName} /${p.familyName ?? ''}/`);
      if (p.gender) lines.push(`1 SEX ${p.gender === 'MALE' ? 'M' : p.gender === 'FEMALE' ? 'F' : 'U'}`);
      if (p.birthDate) lines.push(`1 BIRT`, `2 DATE ${p.birthDate.toISOString().slice(0, 10)}`);
      if (p.deathDate) lines.push(`1 DEAT`, `2 DATE ${p.deathDate.toISOString().slice(0, 10)}`);
      indi += 1;
    }
    lines.push('0 TRLR');

    await this.usage.increment(workspaceId, UsageMetric.GEDCOM_EXPORTS);
    await this.audit.log({
      workspaceId,
      userId,
      action: 'export.gedcom',
      entityType: 'Family',
      entityId: familyId,
    });

    return {
      fileName: `${family.name ?? 'family'}.ged`,
      gedcomText: lines.join('\n'),
      personCount: family.members.length,
      gedcomAdvanced: advanced,
    };
  }
}
