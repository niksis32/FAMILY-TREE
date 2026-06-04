import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { loadCommunitySpamConfig } from './community-spam.config';
import { countUrlsInContent, normalizeCommunityText } from './community-spam.util';

@Injectable()
export class CommunitySpamGuardService {
  private readonly config = loadCommunitySpamConfig();

  constructor(private readonly prisma: PrismaService) {}

  private bypass(role?: string): boolean {
    return role === 'ADMIN';
  }

  async assertPostAllowed(params: {
    userId: string;
    groupId: string;
    content: string;
    role?: string;
  }): Promise<void> {
    if (this.bypass(params.role)) return;

    const trimmed = params.content.trim();
    if (!trimmed) {
      throw new HttpException('Post content is empty', HttpStatus.BAD_REQUEST);
    }

    const urlCount = countUrlsInContent(trimmed);
    if (urlCount > this.config.postMaxUrls) {
      throw new HttpException(
        `Too many links in one post (max ${this.config.postMaxUrls})`,
        HttpStatus.BAD_REQUEST,
      );
    }

    const now = new Date();
    const cooldownSince = new Date(now.getTime() - this.config.postCooldownSec * 1000);
    const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const duplicateSince = new Date(now.getTime() - this.config.postDuplicateWindowSec * 1000);
    const normalized = normalizeCommunityText(trimmed);

    const [lastInGroup, hourGlobal, hourInGroup, dayGlobal, recentPosts] = await Promise.all([
      this.prisma.forumPost.findFirst({
        where: { authorId: params.userId, thread: { groupId: params.groupId } },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
      }),
      this.prisma.forumPost.count({
        where: { authorId: params.userId, createdAt: { gte: hourAgo } },
      }),
      this.prisma.forumPost.count({
        where: {
          authorId: params.userId,
          createdAt: { gte: hourAgo },
          thread: { groupId: params.groupId },
        },
      }),
      this.prisma.forumPost.count({
        where: { authorId: params.userId, createdAt: { gte: dayAgo } },
      }),
      this.prisma.forumPost.findMany({
        where: { authorId: params.userId, createdAt: { gte: duplicateSince } },
        select: { content: true },
        take: 20,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    if (lastInGroup && lastInGroup.createdAt > cooldownSince) {
      throw new HttpException(
        `Please wait ${this.config.postCooldownSec}s before posting again in this group`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    if (hourGlobal >= this.config.postMaxPerHour) {
      throw new HttpException(
        `Hourly post limit reached (max ${this.config.postMaxPerHour} per hour)`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    if (hourInGroup >= this.config.postMaxPerGroupHour) {
      throw new HttpException(
        `Group hourly post limit reached (max ${this.config.postMaxPerGroupHour} per hour)`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    if (dayGlobal >= this.config.postMaxPerDay) {
      throw new HttpException(
        `Daily post limit reached (max ${this.config.postMaxPerDay} per day)`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    if (recentPosts.some((p) => normalizeCommunityText(p.content) === normalized)) {
      throw new HttpException('Duplicate post detected — please wait before reposting', HttpStatus.TOO_MANY_REQUESTS);
    }
  }

  async assertThreadAllowed(params: {
    userId: string;
    groupId: string;
    title: string;
    role?: string;
  }): Promise<void> {
    if (this.bypass(params.role)) return;

    const trimmed = params.title.trim();
    if (!trimmed) {
      throw new HttpException('Thread title is empty', HttpStatus.BAD_REQUEST);
    }

    const now = new Date();
    const cooldownSince = new Date(now.getTime() - this.config.threadCooldownSec * 1000);
    const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const normalizedTitle = normalizeCommunityText(trimmed);

    const [lastInGroup, hourGlobal, recentThreads] = await Promise.all([
      this.prisma.forumThread.findFirst({
        where: { authorId: params.userId, groupId: params.groupId, deletedAt: null },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
      }),
      this.prisma.forumThread.count({
        where: { authorId: params.userId, createdAt: { gte: hourAgo }, deletedAt: null },
      }),
      this.prisma.forumThread.findMany({
        where: {
          authorId: params.userId,
          groupId: params.groupId,
          createdAt: { gte: hourAgo },
          deletedAt: null,
        },
        select: { title: true },
        take: 10,
      }),
    ]);

    if (lastInGroup && lastInGroup.createdAt > cooldownSince) {
      throw new HttpException(
        `Please wait ${this.config.threadCooldownSec}s before starting another topic in this group`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    if (hourGlobal >= this.config.threadMaxPerHour) {
      throw new HttpException(
        `Hourly topic limit reached (max ${this.config.threadMaxPerHour} per hour)`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    if (recentThreads.some((t) => normalizeCommunityText(t.title) === normalizedTitle)) {
      throw new HttpException('You already started a topic with this title recently', HttpStatus.TOO_MANY_REQUESTS);
    }
  }
}
