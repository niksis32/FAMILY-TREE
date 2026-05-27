export * from './locales';
export * from './locale-display';
export * from './gamification';
export * from './photo-intelligence';
export * from './matching';

/** API route prefix — must match NestJS global prefix */
export const API_PREFIX = '/api/v1';

/** Default pagination for list endpoints (MVP) */
export const DEFAULT_PAGE_SIZE = 20;

/** Relationship types — extend as genealogy-core rules grow */
export const RELATIONSHIP_TYPES = [
  'parent',
  'child',
  'spouse',
  'sibling',
  'partner',
  'adoptive_parent',
  'adoptive_child',
] as const;

/** Event types for life timeline */
export const EVENT_TYPES = [
  'birth',
  'death',
  'marriage',
  'divorce',
  'burial',
  'residence',
  'occupation',
  'immigration',
  'custom',
] as const;
