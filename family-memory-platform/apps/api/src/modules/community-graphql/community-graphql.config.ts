import {
  COMMUNITY_GRAPHQL_DEFAULT_MAX_DEPTH,
  COMMUNITY_GRAPHQL_DEFAULT_RATE_LIMIT,
  COMMUNITY_GRAPHQL_SUBGRAPH_NAME,
} from '@family/shared';

export interface CommunityGraphqlConfig {
  enabled: boolean;
  federationEnabled: boolean;
  introspectionEnabled: boolean;
  maxDepth: number;
  rateLimitPerMinute: number;
  subgraphName: string;
}

function parseBool(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value === '') return fallback;
  return value === '1' || value.toLowerCase() === 'true' || value.toLowerCase() === 'yes';
}

function parsePositiveInt(value: string | undefined, fallback: number): number {
  const n = Number.parseInt(value ?? '', 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/** Production-safe defaults: introspection off when NODE_ENV=production unless overridden. */
export function loadCommunityGraphqlConfig(): CommunityGraphqlConfig {
  const isProduction = process.env.NODE_ENV === 'production';

  return {
    enabled: parseBool(process.env.COMMUNITY_GRAPHQL_ENABLED, true),
    federationEnabled: parseBool(process.env.COMMUNITY_GRAPHQL_FEDERATION_ENABLED, true),
    introspectionEnabled: parseBool(
      process.env.COMMUNITY_GRAPHQL_INTROSPECTION,
      !isProduction,
    ),
    maxDepth: parsePositiveInt(
      process.env.COMMUNITY_GRAPHQL_MAX_DEPTH,
      COMMUNITY_GRAPHQL_DEFAULT_MAX_DEPTH,
    ),
    rateLimitPerMinute: parsePositiveInt(
      process.env.COMMUNITY_GRAPHQL_RATE_LIMIT,
      COMMUNITY_GRAPHQL_DEFAULT_RATE_LIMIT,
    ),
    subgraphName: process.env.COMMUNITY_GRAPHQL_SUBGRAPH_NAME?.trim() || COMMUNITY_GRAPHQL_SUBGRAPH_NAME,
  };
}
