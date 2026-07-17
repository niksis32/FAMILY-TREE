import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AdminStatsResponse, AdminUserListResponse, AdminUserSummary } from '@family/shared';
import { hashPassword } from '../../common/crypto/password.util';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthSessionService } from '../auth/auth-session.service';
import type { AdminCreateUserDto, AdminSoftDeleteUserDto, AdminUpdateUserDto } from './admin.dto';

const SOFT_DELETE_CONFIRM_PHRASE = 'DELETE';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authSessions: AuthSessionService,
  ) {}

  async getStats(): Promise<AdminStatsResponse> {
    const [personsCount, mediaAggregate, lastAudit] = await Promise.all([
      this.prisma.person.count({ where: { deletedAt: null } }),
      this.prisma.media.aggregate({
        where: { deletedAt: null },
        _count: { _all: true },
        _sum: { sizeBytes: true },
      }),
      this.prisma.auditLog.findFirst({
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          action: true,
          entityType: true,
          entityId: true,
          userId: true,
          workspaceId: true,
          createdAt: true,
        },
      }),
    ]);

    return {
      generatedAt: new Date().toISOString(),
      personsCount,
      mediaCount: mediaAggregate._count._all,
      mediaBytes: mediaAggregate._sum.sizeBytes ?? 0,
      lastAudit: lastAudit
        ? {
            id: lastAudit.id,
            action: lastAudit.action,
            entityType: lastAudit.entityType,
            entityId: lastAudit.entityId,
            userId: lastAudit.userId,
            workspaceId: lastAudit.workspaceId,
            createdAt: lastAudit.createdAt.toISOString(),
          }
        : null,
    };
  }

  async listUsers(limitRaw?: number, offsetRaw?: number): Promise<AdminUserListResponse> {
    const limit = Math.min(Math.max(limitRaw ?? 50, 1), 100);
    const offset = Math.max(offsetRaw ?? 0, 0);

    const [rows, total] = await Promise.all([
      this.prisma.user.findMany({
        where: { deletedAt: null },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        select: {
          id: true,
          email: true,
          displayName: true,
          role: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          _count: { select: { workspaceMemberships: true } },
        },
      }),
      this.prisma.user.count({ where: { deletedAt: null } }),
    ]);

    return {
      total,
      limit,
      offset,
      items: rows.map((row) => ({
        id: row.id,
        email: row.email,
        displayName: row.displayName,
        role: row.role,
        isActive: row.isActive,
        workspaceCount: row._count.workspaceMemberships,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
      })),
    };
  }

  async createUser(dto: AdminCreateUserDto): Promise<AdminUserSummary> {
    const email = dto.email.toLowerCase();
    const existing = await this.prisma.user.findFirst({
      where: { email },
      select: { id: true, deletedAt: true },
    });

    if (existing) {
      if (!existing.deletedAt) {
        throw new ConflictException('User with this email already exists');
      }
      throw new ConflictException('User with this email was marked for deletion. Contact support to restore the account.');
    }

    const row = await this.prisma.user.create({
      data: {
        email,
        displayName: dto.displayName,
        passwordHash: hashPassword(dto.password),
        role: dto.role,
        isActive: dto.isActive ?? true,
      },
      select: this.userSelect(),
    });

    return this.mapUser(row);
  }

  async updateUser(userId: string, dto: AdminUpdateUserDto, actorId: string): Promise<AdminUserSummary> {
    const existing = await this.requireActiveUser(userId);

    if (dto.role && dto.role !== 'ADMIN' && existing.id === actorId && existing.role === 'ADMIN') {
      throw new BadRequestException('You cannot remove your own administrator role');
    }

    if (dto.isActive === false && existing.id === actorId) {
      throw new BadRequestException('You cannot deactivate your own account');
    }

    const row = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.displayName !== undefined ? { displayName: dto.displayName } : {}),
        ...(dto.role !== undefined ? { role: dto.role } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        ...(dto.password ? { passwordHash: hashPassword(dto.password) } : {}),
      },
      select: this.userSelect(),
    });

    if (dto.isActive === false || dto.password) {
      await this.authSessions.revokeAllForUser(userId, actorId, dto.password ? 'password_changed' : 'account_deactivated');
    }

    return this.mapUser(row);
  }

  async softDeleteUser(
    userId: string,
    dto: AdminSoftDeleteUserDto,
    actorId: string,
  ): Promise<AdminUserSummary> {
    if (userId === actorId) {
      throw new ForbiddenException('You cannot delete your own account');
    }

    const existing = await this.requireActiveUser(userId);

    if (dto.confirmEmail.toLowerCase() !== existing.email.toLowerCase()) {
      throw new BadRequestException('Confirmation email does not match');
    }

    if (dto.confirmPhrase.trim().toUpperCase() !== SOFT_DELETE_CONFIRM_PHRASE) {
      throw new BadRequestException('Confirmation phrase is incorrect');
    }

    const row = await this.prisma.user.update({
      where: { id: userId },
      data: {
        deletedAt: new Date(),
        isActive: false,
      },
      select: this.userSelect(),
    });

    await this.authSessions.revokeAllForUser(userId, actorId, 'account_deleted');

    return this.mapUser(row);
  }

  private userSelect() {
    return {
      id: true,
      email: true,
      displayName: true,
      role: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { workspaceMemberships: true } },
    } as const;
  }

  private mapUser(row: {
    id: string;
    email: string;
    displayName: string | null;
    role: 'VIEWER' | 'EDITOR' | 'ADMIN';
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    _count: { workspaceMemberships: number };
  }): AdminUserSummary {
    return {
      id: row.id,
      email: row.email,
      displayName: row.displayName,
      role: row.role,
      isActive: row.isActive,
      workspaceCount: row._count.workspaceMemberships,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private async requireActiveUser(userId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: { id: true, email: true, role: true, isActive: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }
}
