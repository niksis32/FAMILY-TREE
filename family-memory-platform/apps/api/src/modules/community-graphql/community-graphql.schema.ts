/**
 * Community subgraph SDL — federation v2.3 compatible for Apollo Router / Gateway registration.
 * Executable schema uses the same field definitions without federation link directive.
 */
export const COMMUNITY_GRAPHQL_FEDERATION_SDL = `
  extend schema
    @link(url: "https://specs.apollo.dev/f/v2.3", import: ["@key", "@shareable"])

  type FeedAuthor @key(fields: "id") {
    id: String!
    displayName: String
  }

  type FeedThread @key(fields: "id") {
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

  type _Service {
    sdl: String!
  }

  type Query {
    """Rich read model: latest published threads, optional group filter, pagination."""
    communityFeed(groupId: String, skip: Int, take: Int): CommunityFeedResult!
    """Per-user reputation within a single group (B2 + F2 decay applied server-side)."""
    reputationInGroup(userId: String!, groupId: String!): Float!
    """Federation subgraph introspection — for Apollo Router composition."""
    _service: _Service!
  }
`;

/** Executable SDL (no federation directives — graphql-js buildSchema). */
export const COMMUNITY_GRAPHQL_EXECUTABLE_SDL = `
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
  type _Service {
    sdl: String!
  }
  type Query {
    """Rich read model: latest published threads, optional group filter, pagination."""
    communityFeed(groupId: String, skip: Int, take: Int): CommunityFeedResult!
    """Per-user reputation within a single group (B2 + F2 decay applied server-side)."""
    reputationInGroup(userId: String!, groupId: String!): Float!
    """Federation subgraph introspection — for Apollo Router composition."""
    _service: _Service!
  }
`;
