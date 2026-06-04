import { Body, Controller, Get, Post, ServiceUnavailableException, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { IsObject, IsOptional, IsString } from 'class-validator';
import { CommunityGraphqlService } from './community-graphql.service';

class GraphqlRequestDto {
  @IsString()
  query!: string;

  @IsOptional()
  @IsObject()
  variables?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  operationName?: string;
}

/** Rate limit aligned with COMMUNITY_GRAPHQL_RATE_LIMIT env (default 30/min). */
function communityGraphqlThrottle() {
  const limit = Number.parseInt(process.env.COMMUNITY_GRAPHQL_RATE_LIMIT ?? '30', 10);
  return { 'community-graphql': { limit: Number.isFinite(limit) && limit > 0 ? limit : 30, ttl: 60_000 } } as const;
}

@ApiTags('community-graphql')
@Controller('community/graphql')
export class CommunityGraphqlController {
  constructor(private readonly gql: CommunityGraphqlService) {}

  @Post()
  @UseGuards(ThrottlerGuard)
  @Throttle(communityGraphqlThrottle())
  run(@Body() body: GraphqlRequestDto) {
    return this.gql.execute({ query: body.query, variables: body.variables });
  }

  /**
   * Production: register this SDL in Apollo Router / Gateway supergraph config.
   * Routing URL (monolith): {API_URL}/api/v1/community/graphql
   */
  @Get('federation/sdl')
  getFederationSdl() {
    const config = this.gql.getConfig();
    if (!config.enabled) {
      throw new ServiceUnavailableException('Community GraphQL is disabled');
    }
    if (!config.federationEnabled) {
      throw new ServiceUnavailableException('Community GraphQL federation is disabled');
    }
    return {
      name: config.subgraphName,
      routingUrl: '/api/v1/community/graphql',
      sdl: this.gql.getFederationSdl(),
    };
  }
}
