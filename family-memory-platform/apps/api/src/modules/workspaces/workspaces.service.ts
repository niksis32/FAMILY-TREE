import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class WorkspacesService {
  constructor(private readonly prisma: PrismaService) {}

  /** Ensures tenant + default workspace + membership for the user. */
  async ensureDefaultWorkspace(userId: string) {
    const existing = await this.prisma.workspaceMember.findFirst({
      where: { userId },
      include: { workspace: { include: { tenant: true } } },
      orderBy: { createdAt: 'asc' },
    });
    if (existing) return existing.workspace;

    const tenant = await this.prisma.tenant.upsert({
      where: { slug: `user-${userId}` },
      create: { slug: `user-${userId}`, name: 'Personal tenant' },
      update: {},
    });

    const workspace = await this.prisma.workspace.create({
      data: {
        tenantId: tenant.id,
        name: 'Default workspace',
        isDefault: true,
        members: {
          create: { userId, role: 'OWNER' },
        },
      },
    });

    return workspace;
  }

  async assertMember(workspaceId: string, userId: string) {
    const member = await this.prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
    });
    if (!member) {
      throw new ForbiddenException('Not a member of this workspace');
    }
    return member;
  }

  async assignFamilyToUserWorkspace(familyId: string, userId: string) {
    const workspace = await this.ensureDefaultWorkspace(userId);
    await this.assertMember(workspace.id, userId);

    const family = await this.prisma.family.findFirst({
      where: { id: familyId, deletedAt: null },
    });
    if (!family) throw new NotFoundException('Family not found');

    if (!family.workspaceId) {
      await this.prisma.family.update({
        where: { id: familyId },
        data: { workspaceId: workspace.id },
      });
    } else {
      await this.assertMember(family.workspaceId, userId);
    }

    return workspace;
  }
}
