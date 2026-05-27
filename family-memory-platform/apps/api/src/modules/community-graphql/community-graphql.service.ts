import { Injectable } from '@nestjs/common';
import { ForumContentStatus } from '@prisma/client';
import { graphql, buildSchema } from 'graphql';
import { PrismaService } from '../../prisma/prisma.service';
import { CommunityReputationService } from '../community-reputation/community-reputation.service';

const schema = buildSchema(`
  type FeedAuthor {
    id: String!
    displayName: String
  }
  type FeedThread {
    id: String!
    title: String!
    groupId: String!
    updatedAt: String!
    author: FeedAuthor
  }
  type CommunityFeedResult {
    threads: [FeedThread!]!
    total: Int!
  }
  type Query {
    """Rich read model: latest published threads, optional group filter, pagination."""
    communityFeed(groupId: String, skip: Int, take: Int): CommunityFeedResult!
    """Per-user reputation within a single group (B2 + F2 decay applied server-side)."""
    reputationInGroup(userId: String!, groupId: String!): Float!
  }
`);

@Injectable()
export class CommunityGraphqlService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reputation: CommunityReputationService,
  ) {}

  async execute(params: { query: string; variables?: Record<string, unknown> | null }) {
    const root = {
      communityFeed: async (args: {
        groupId?: string | null;
        skip?: number | null;
        take?: number | null;
      }) => {
        const skip = Math.max(0, args.skip ?? 0);
        const take = Math.min(50, Math.max(1, args.take ?? 20));
        const where = {
          deletedAt: null,
          contentStatus: ForumContentStatus.PUBLISHED,
          ...(args.groupId ? { groupId: args.groupId } : {}),
        };
        const [threads, total] = await Promise.all([
          this.prisma.forumThread.findMany({
            where,
            orderBy: { updatedAt: 'desc' },
            skip,
            take,
            include: { author: { select: { id: true, displayName: true } } },
          }),
          this.prisma.forumThread.count({ where }),
        ]);
        return {
          threads: threads.map((t) => ({
            id: t.id,
            title: t.title,
            groupId: t.groupId,
            updatedAt: t.updatedAt.toISOString(),
            author: t.author,
          })),
          total,
        };
      },
      reputationInGroup: async (args: { userId: string; groupId: string }) => {
        return this.reputation.scoreInGroup(args.userId, args.groupId);
      },
    };

    return graphql({
      schema,
      source: params.query,
      rootValue: root,
      variableValues: params.variables ?? undefined,
    });
  }
}
