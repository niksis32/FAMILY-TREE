/** PROMPT 8 — Community GraphQL subgraph (federation-ready) production defaults. */

export const COMMUNITY_GRAPHQL_SUBGRAPH_NAME = 'community';

/** Max nested field selections per query (feed + author ≈ 3). */
export const COMMUNITY_GRAPHQL_DEFAULT_MAX_DEPTH = 6;

/** POST /community/graphql — requests per IP per minute in production. */
export const COMMUNITY_GRAPHQL_DEFAULT_RATE_LIMIT = 30;

/** Max `take` argument enforced server-side regardless of client input. */
export const COMMUNITY_GRAPHQL_MAX_PAGE_SIZE = 50;
