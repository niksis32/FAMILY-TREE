import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  ForumContentStatus,
  ModerationActionType,
  ModerationReportStatus,
  type ModerationReport,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CommunityReputationService } from '../community-reputation/community-reputation.service';
import { CreateModerationReportDto, ModerationResolveDto } from './community-moderation.dto';
import { ModeratePostDto } from './community-moderation-post.dto';

export type ModerationTargetPreview = {
  kind: string;
  content?: string;
  threadId?: string;
  threadTitle?: string;
  groupId?: string;
  groupTitle?: string;
  authorId?: string;
  authorName?: string | null;
  contentStatus?: string;
};

export type ModerationQueueReport = ModerationReport & {
  reporter: { id: string; displayName: string | null };
  targetPreview: ModerationTargetPreview | null;
};

export type ModerationQueuePendingPost = {
  id: string;
  threadId: string;
  authorId: string;
  content: string;
  referencesLivingPersonData: boolean;
  hasConsentForPublicLivingData: boolean;
  contentStatus: string;
  createdAt: Date;
  author: { id: string; displayName: string | null };
  thread: {
    id: string;
    title: string;
    groupId: string;
    group: { id: string; title: string };
  };
};

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

  async getQueue(): Promise<{
    stats: { openReports: number; underReview: number; pendingPosts: number };
    reports: ModerationQueueReport[];
    pendingPosts: ModerationQueuePendingPost[];
  }> {
    const [reports, pendingPosts, openCount, underReviewCount] = await Promise.all([
      this.prisma.moderationReport.findMany({
        where: { status: { in: ['OPEN', 'UNDER_REVIEW'] } },
        orderBy: [{ status: 'asc' }, { createdAt: 'asc' }],
        take: 200,
        include: { reporter: { select: { id: true, displayName: true } } },
      }),
      this.prisma.forumPost.findMany({
        where: { contentStatus: ForumContentStatus.PENDING_REVIEW, deletedAt: null },
        orderBy: { createdAt: 'asc' },
        take: 100,
        include: {
          author: { select: { id: true, displayName: true } },
          thread: {
            select: {
              id: true,
              title: true,
              groupId: true,
              group: { select: { id: true, title: true } },
            },
          },
        },
      }),
      this.prisma.moderationReport.count({ where: { status: 'OPEN' } }),
      this.prisma.moderationReport.count({ where: { status: 'UNDER_REVIEW' } }),
    ]);

    const enriched = await Promise.all(
      reports.map(async (report) => ({
        ...report,
        targetPreview: await this.loadTargetPreview(report.targetType, report.targetId),
      })),
    );

    return {
      stats: {
        openReports: openCount,
        underReview: underReviewCount,
        pendingPosts: pendingPosts.length,
      },
      reports: enriched,
      pendingPosts,
    };
  }

  private async loadTargetPreview(
    targetType: string,
    targetId: string,
  ): Promise<ModerationTargetPreview | null> {
    if (targetType === 'FORUM_POST') {
      const post = await this.prisma.forumPost.findFirst({
        where: { id: targetId, deletedAt: null },
        include: {
          author: { select: { id: true, displayName: true } },
          thread: { include: { group: { select: { id: true, title: true } } } },
        },
      });
      if (!post) return null;
      return {
        kind: 'FORUM_POST',
        content: post.content.length > 500 ? `${post.content.slice(0, 500)}…` : post.content,
        threadId: post.threadId,
        threadTitle: post.thread.title,
        groupId: post.thread.groupId,
        groupTitle: post.thread.group.title,
        authorId: post.authorId,
        authorName: post.author.displayName,
        contentStatus: post.contentStatus,
      };
    }

    if (targetType === 'FORUM_THREAD') {
      const thread = await this.prisma.forumThread.findFirst({
        where: { id: targetId, deletedAt: null },
        include: {
          author: { select: { id: true, displayName: true } },
          group: { select: { id: true, title: true } },
        },
      });
      if (!thread) return null;
      return {
        kind: 'FORUM_THREAD',
        content: thread.title,
        threadId: thread.id,
        threadTitle: thread.title,
        groupId: thread.groupId,
        groupTitle: thread.group.title,
        authorId: thread.authorId,
        authorName: thread.author.displayName,
        contentStatus: thread.contentStatus,
      };
    }

    return { kind: targetType };
  }

  async approvePost(postId: string, moderatorId: string) {
    const post = await this.requirePost(postId);
    if (post.contentStatus !== ForumContentStatus.PENDING_REVIEW) {
      throw new BadRequestException('Post is not pending review');
    }

    await this.prisma.forumPost.update({
      where: { id: postId },
      data: { contentStatus: ForumContentStatus.PUBLISHED },
    });

    await this.prisma.moderationAction.create({
      data: {
        moderatorId,
        targetType: 'FORUM_POST',
        targetId: postId,
        actionType: ModerationActionType.RESTORE,
        reason: 'Approved from moderation queue',
      },
    });

    return { ok: true };
  }

  async hidePost(postId: string, moderatorId: string, dto: ModeratePostDto) {
    const post = await this.requirePost(postId);

    await this.prisma.forumPost.update({
      where: { id: postId },
      data: { contentStatus: ForumContentStatus.HIDDEN },
    });

    await this.prisma.moderationAction.create({
      data: {
        moderatorId,
        targetType: 'FORUM_POST',
        targetId: postId,
        actionType: ModerationActionType.HIDE_CONTENT,
        reason: dto.moderatorNote,
      },
    });

    if (dto.applyStrikeToAuthor) {
      await this.reputation.addStrike(post.authorId, 1);
      await this.reputation.penaltyForUserInGroup(
        post.authorId,
        post.thread.groupId,
        -6,
        dto.moderatorNote ?? 'Moderation hide',
      );
    }

    return { ok: true };
  }

  private async requirePost(postId: string) {
    const post = await this.prisma.forumPost.findFirst({
      where: { id: postId, deletedAt: null },
      include: { thread: true },
    });
    if (!post) throw new NotFoundException('Post not found');
    return post;
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

