import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CommunityReputationEventType,
  ForumContentStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CommunityGroupsService } from '../community-groups/community-groups.service';
import { CommunityReputationService } from '../community-reputation/community-reputation.service';
import { isPubliclyVisibleContent, resolveInitialContentStatus } from '../community-groups/community-privacy';
import { CreateForumPostDto, CreateForumThreadDto, ForumPaginationQueryDto } from './community-forum.dto';

const DEFAULT_TAKE = 20;

@Injectable()
export class CommunityForumService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly groups: CommunityGroupsService,
    private readonly reputation: CommunityReputationService,
  ) {}

  private threadWhereVisible(userId?: string): Prisma.ForumThreadWhereInput {
    const base: Prisma.ForumThreadWhereInput = { deletedAt: null };
    if (!userId) {
      return { ...base, contentStatus: ForumContentStatus.PUBLISHED };
    }
    return {
      ...base,
      OR: [
        { contentStatus: ForumContentStatus.PUBLISHED },
        { authorId: userId },
      ],
    };
  }

  private postWhereVisible(userId?: string): Prisma.ForumPostWhereInput {
    const base: Prisma.ForumPostWhereInput = { deletedAt: null };
    if (!userId) {
      return { ...base, contentStatus: ForumContentStatus.PUBLISHED };
    }
    return {
      ...base,
      OR: [
        { contentStatus: ForumContentStatus.PUBLISHED },
        { authorId: userId },
      ],
    };
  }

  async listThreads(groupId: string, query: ForumPaginationQueryDto, userId?: string) {
    await this.groups.assertGroupVisibleToUser(groupId, userId);
    const skip = query.skip ?? 0;
    const take = Math.min(query.take ?? DEFAULT_TAKE, 50);
    return this.prisma.forumThread.findMany({
      where: { groupId, ...this.threadWhereVisible(userId) },
      orderBy: { updatedAt: 'desc' },
      skip,
      take,
      include: {
        author: { select: { id: true, displayName: true } },
        _count: { select: { posts: true } },
      },
    });
  }

  async createThread(groupId: string, authorId: string, dto: CreateForumThreadDto) {
    await this.groups.assertGroupVisibleToUser(groupId, authorId);
    const can = await this.reputation.canPostInGroup(authorId, groupId);
    if (!can.ok) throw new ForbiddenException(can.reason);

    const thread = await this.prisma.forumThread.create({
      data: {
        groupId,
        authorId,
        title: dto.title,
        tags: dto.tags ?? [],
        documentId: dto.documentId ?? null,
        contentStatus: ForumContentStatus.PUBLISHED,
      },
    });
    await this.reputation.recordEvent({
      userId: authorId,
      groupId,
      type: CommunityReputationEventType.THREAD_START,
      baseWeight: 2,
      relatedThreadId: thread.id,
    });
    return this.getThread(thread.id, authorId);
  }

  async getThread(threadId: string, userId?: string) {
    const thread = await this.prisma.forumThread.findFirst({
      where: { id: threadId, deletedAt: null, ...this.threadWhereVisible(userId) },
      include: {
        group: true,
        author: { select: { id: true, displayName: true } },
        document: { select: { id: true, title: true, documentType: true } },
      },
    });
    if (!thread) throw new NotFoundException('Thread not found');
    await this.groups.assertGroupVisibleToUser(thread.groupId, userId);
    return thread;
  }

  async listPosts(threadId: string, query: ForumPaginationQueryDto, userId?: string) {
    const thread = await this.getThread(threadId, userId);
    const skip = query.skip ?? 0;
    const take = Math.min(query.take ?? DEFAULT_TAKE, 50);
    const posts = await this.prisma.forumPost.findMany({
      where: { threadId: thread.id, ...this.postWhereVisible(userId) },
      orderBy: { createdAt: 'asc' },
      skip,
      take,
      include: {
        author: { select: { id: true, displayName: true } },
        ...(userId
          ? { helpfulVotes: { where: { voterId: userId }, select: { id: true } } }
          : {}),
      },
    });
    const groupId = thread.groupId;
    return Promise.all(
      posts.map(async (p) => {
        const votes = 'helpfulVotes' in p ? (p.helpfulVotes as { id: string }[]) : [];
        const { helpfulVotes: _, ...rest } = p as typeof p & { helpfulVotes?: unknown };
        const authorReputationInGroup = await this.reputation.scoreInGroup(p.authorId, groupId);
        return {
          ...rest,
          authorReputationInGroup,
          viewerMarkedHelpful: userId ? votes.length > 0 : false,
        };
      }),
    );
  }

  async createPost(threadId: string, authorId: string, dto: CreateForumPostDto) {
    const thread = await this.getThread(threadId, authorId);
    if (thread.status === 'LOCKED') throw new ForbiddenException('Thread is locked');
    const can = await this.reputation.canPostInGroup(authorId, thread.groupId);
    if (!can.ok) throw new ForbiddenException(can.reason);

    const refLiving = dto.referencesLivingPersonData === true;
    const consent = dto.hasConsentForPublicLivingData === true;

    const contentStatus = resolveInitialContentStatus({
      referencesLivingPersonData: refLiving,
      hasConsentForPublicLivingData: consent,
    });

    const post = await this.prisma.forumPost.create({
      data: {
        threadId,
        authorId,
        content: dto.content,
        attachments: dto.attachments?.length
          ? (dto.attachments as unknown as Prisma.InputJsonValue)
          : undefined,
        referencesLivingPersonData: refLiving,
        hasConsentForPublicLivingData: consent,
        contentStatus,
      },
    });

    await this.prisma.forumThread.update({
      where: { id: threadId },
      data: { updatedAt: new Date() },
    });

    await this.reputation.recordEvent({
      userId: authorId,
      groupId: thread.groupId,
      type: CommunityReputationEventType.REPLY,
      baseWeight: 0.5,
      relatedPostId: post.id,
      relatedThreadId: threadId,
    });

    return post;
  }

  async markHelpful(postId: string, voterId: string) {
    const post = await this.prisma.forumPost.findFirst({
      where: { id: postId, deletedAt: null },
      include: { thread: true },
    });
    if (!post) throw new NotFoundException('Post not found');
    if (post.authorId === voterId) throw new BadRequestException('Cannot mark own post');
    if (!isPubliclyVisibleContent(post.contentStatus)) throw new NotFoundException('Post not found');

    try {
      await this.prisma.forumPostHelpfulVote.create({
        data: {
          threadId: post.threadId,
          postId: post.id,
          voterId,
        },
      });
    } catch {
      throw new BadRequestException('Already marked helpful');
    }

    await this.prisma.forumPost.update({
      where: { id: postId },
      data: { helpfulCount: { increment: 1 } },
    });

    await this.reputation.recordEvent({
      userId: post.authorId,
      groupId: post.thread.groupId,
      type: CommunityReputationEventType.HELPFUL_POST,
      baseWeight: 3,
      relatedPostId: post.id,
      relatedThreadId: post.threadId,
    });

    return { ok: true };
  }

  async setExpertAnswer(postId: string, actorId: string, isAdmin: boolean) {
    const post = await this.prisma.forumPost.findFirst({
      where: { id: postId, deletedAt: null },
      include: { thread: true },
    });
    if (!post) throw new NotFoundException('Post not found');
    if (!isAdmin && post.thread.authorId !== actorId) {
      throw new ForbiddenException('Only thread author or admin can mark expert answer');
    }
    await this.prisma.forumPost.update({
      where: { id: postId },
      data: { isExpertAnswer: true },
    });
    await this.reputation.recordEvent({
      userId: post.authorId,
      groupId: post.thread.groupId,
      type: CommunityReputationEventType.EXPERT_ANSWER_ACCEPTED,
      baseWeight: 8,
      relatedPostId: post.id,
    });
    return { ok: true };
  }
}
