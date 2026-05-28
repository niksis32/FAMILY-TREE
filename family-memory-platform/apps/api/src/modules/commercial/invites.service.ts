import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import type { WorkspaceInviteSummary } from '@family/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { CommercialContextService } from './commercial-context.service';
import { CommercialAuditService } from './commercial-audit.service';

@Injectable()
export class InvitesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly context: CommercialContextService,
    private readonly audit: CommercialAuditService,
  ) {}

  private hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  private toSummary(invite: {
    id: string;
    email: string;
    role: string;
    status: string;
    expiresAt: Date;
    createdAt: Date;
  }): WorkspaceInviteSummary {
    return {
      id: invite.id,
      email: invite.email,
      role: invite.role as WorkspaceInviteSummary['role'],
      status: invite.status,
      expiresAt: invite.expiresAt.toISOString(),
      createdAt: invite.createdAt.toISOString(),
    };
  }

  async list(workspaceId: string, userId: string): Promise<WorkspaceInviteSummary[]> {
    await this.context.resolveForUser(workspaceId, userId);
    const invites = await this.prisma.workspaceInvite.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return invites.map((i) => this.toSummary(i));
  }

  async create(
    workspaceId: string,
    userId: string,
    email: string,
    role: 'OWNER' | 'EDITOR' | 'VIEWER',
  ) {
    await this.context.assertOwner(workspaceId, userId);

    const token = randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(token);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const invite = await this.prisma.workspaceInvite.create({
      data: {
        workspaceId,
        email: email.toLowerCase().trim(),
        role,
        tokenHash,
        invitedById: userId,
        expiresAt,
      },
    });

    await this.audit.log({
      workspaceId,
      userId,
      action: 'workspace.invite.created',
      entityType: 'WorkspaceInvite',
      entityId: invite.id,
      payload: { email: invite.email, role },
    });

    return {
      invite: this.toSummary(invite),
      acceptToken: token,
      acceptUrl: `/invites/accept?token=${token}`,
    };
  }

  async revoke(workspaceId: string, userId: string, inviteId: string) {
    await this.context.assertOwner(workspaceId, userId);
    const invite = await this.prisma.workspaceInvite.findFirst({
      where: { id: inviteId, workspaceId },
    });
    if (!invite) throw new NotFoundException('Invite not found');
    if (invite.status !== 'PENDING') {
      throw new BadRequestException('Only pending invites can be revoked');
    }
    return this.prisma.workspaceInvite.update({
      where: { id: inviteId },
      data: { status: 'REVOKED' },
    });
  }

  async accept(token: string, userId: string, userEmail: string) {
    const tokenHash = this.hashToken(token);
    const invite = await this.prisma.workspaceInvite.findUnique({
      where: { tokenHash },
      include: { workspace: true },
    });
    if (!invite || invite.status !== 'PENDING') {
      throw new NotFoundException('Invite not found or already used');
    }
    if (invite.expiresAt < new Date()) {
      await this.prisma.workspaceInvite.update({
        where: { id: invite.id },
        data: { status: 'EXPIRED' },
      });
      throw new BadRequestException('Invite expired');
    }
    if (invite.email.toLowerCase() !== userEmail.toLowerCase()) {
      throw new ForbiddenException('Invite email does not match your account');
    }

    await this.prisma.workspaceMember.upsert({
      where: {
        workspaceId_userId: { workspaceId: invite.workspaceId, userId },
      },
      create: {
        workspaceId: invite.workspaceId,
        userId,
        role: invite.role,
      },
      update: { role: invite.role },
    });

    const updated = await this.prisma.workspaceInvite.update({
      where: { id: invite.id },
      data: { status: 'ACCEPTED', acceptedAt: new Date() },
    });

    await this.audit.log({
      workspaceId: invite.workspaceId,
      userId,
      action: 'workspace.invite.accepted',
      entityType: 'WorkspaceInvite',
      entityId: invite.id,
    });

    return {
      workspaceId: invite.workspaceId,
      workspaceName: invite.workspace.name,
      invite: this.toSummary(updated),
    };
  }
}
