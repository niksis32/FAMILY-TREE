import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ForumContentStatus } from '@prisma/client';
import { COMMUNITY_GRAPHQL_MAX_PAGE_SIZE } from '@family/shared';
import { graphql, buildSchema } from 'graphql';
import { PrismaService } from '../../prisma/prisma.service';
import { CommunityReputationService } from '../community-reputation/community-reputation.service';
import { loadCommunityGraphqlConfig, type CommunityGraphqlConfig } from './community-graphql.config';
import {
  COMMUNITY_GRAPHQL_EXECUTABLE_SDL,
  COMMUNITY_GRAPHQL_FEDERATION_SDL,
} from './community-graphql.schema';
import { assertCommunityGraphqlQueryAllowed } from './community-graphql-security.util';

const schema = buildSchema(COMMUNITY_GRAPHQL_EXECUTABLE_SDL);

@Injectable()
export class CommunityGraphqlService {
  private readonly config: CommunityGraphqlConfig;

  constructor(
    private readonly prisma: PrismaService,
    private readonly reputation: CommunityReputationService,
  ) {
    this.config = loadCommunityGraphqlConfig();
  }

  getConfig(): CommunityGraphqlConfig {
    return this.config;
  }

  /** Federation SDL for Apollo Router / ops registration (GET /community/graphql/federation/sdl). */
  getFederationSdl(): string {
    return COMMUNITY_GRAPHQL_FEDERATION_SDL.trim();
  }

  async execute(params: { query: string; variables?: Record<string, unknown> | null }) {
    if (!this.config.enabled) {
      throw new ServiceUnavailableException('Community GraphQL is disabled');
    }

    assertCommunityGraphqlQueryAllowed(params.query, {
      maxDepth: this.config.maxDepth,
      allowIntrospection: this.config.introspectionEnabled,
      allowFederationService: this.config.federationEnabled,
    });

    const root = {
      _service: () => ({
        sdl: this.config.federationEnabled ? this.getFederationSdl() : '',
      }),
      communityFeed: async (args: {
        groupId?: string | null;
        skip?: number | null;
        take?: number | null;
      }) => {
        const skip = Math.max(0, args.skip ?? 0);
        const take = Math.min(
          COMMUNITY_GRAPHQL_MAX_PAGE_SIZE,
          Math.max(1, args.take ?? 20),
        );
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
