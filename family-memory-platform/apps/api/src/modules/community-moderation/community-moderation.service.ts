import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  ForumContentStatus,
  ModerationActionType,
  ModerationReportStatus,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CommunityReputationService } from '../community-reputation/community-reputation.service';
import { CreateModerationReportDto, ModerationResolveDto } from './community-moderation.dto';

@Injectable()
export class CommunityModerationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reputation: CommunityReputationService,
  ) {}

  createReport(reporterId: string, dto: CreateModerationReportDto) {
    return this.prisma.moderationReport.create({
      data: {
        reporterId,
        targetType: dto.targetType,
        targetId: dto.targetId,
        category: dto.category,
        details: dto.details,
      },
    });
  }

  listOpenReports() {
    return this.prisma.moderationReport.findMany({
      where: { status: { in: ['OPEN', 'UNDER_REVIEW'] } },
      orderBy: { createdAt: 'asc' },
      take: 200,
      include: { reporter: { select: { id: true, displayName: true } } },
    });
  }

  async resolveReport(reportId: string, moderatorId: string, dto: ModerationResolveDto) {
    const report = await this.prisma.moderationReport.findUnique({ where: { id: reportId } });
    if (!report) throw new NotFoundException('Report not found');

    await this.prisma.moderationReport.update({
      where: { id: reportId },
      data: { status: dto.status },
    });

    await this.prisma.moderationAction.create({
      data: {
        moderatorId,
        targetType: report.targetType,
        targetId: report.targetId,
        actionType: ModerationActionType.WARN,
        reason: dto.moderatorNote,
        metadata: { reportId, resolution: dto.status } as object,
      },
    });

    if (dto.status === ModerationReportStatus.RESOLVED && report.targetType === 'FORUM_POST') {
      await this.prisma.forumPost.updateMany({
        where: { id: report.targetId },
        data: { contentStatus: ForumContentStatus.HIDDEN },
      });
      const post = await this.prisma.forumPost.findFirst({
        where: { id: report.targetId },
        include: { thread: true },
      });
      if (post && dto.applyStrikeToTargetAuthor) {
        await this.reputation.addStrike(post.authorId, 1);
        await this.reputation.penaltyForUserInGroup(
          post.authorId,
          post.thread.groupId,
          -6,
          `Moderation report ${reportId}`,
        );
      }
    }

    if (dto.status === ModerationReportStatus.DISMISSED && dto.applyStrikeToTargetAuthor) {
      throw new BadRequestException('Cannot apply strike when dismissing');
    }

    return { ok: true };
  }
}
