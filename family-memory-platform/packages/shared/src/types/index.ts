import type { EVENT_TYPES, RELATIONSHIP_TYPES } from '../constants';

export type RelationshipType = (typeof RELATIONSHIP_TYPES)[number];
export type EventType = (typeof EVENT_TYPES)[number];

/** Base entity fields mirrored in Prisma models */
export interface BaseEntity {
  id: string;
  createdAt: string;
  updatedAt: string;
}

/** MVP person summary for lists and tree nodes */
export interface PersonSummary extends BaseEntity {
  givenName: string;
  patronymic?: string | null;
  familyName?: string | null;
  birthDate?: string | null;
  deathDate?: string | null;
  gender?: string | null;
  privacyLevel?: string | null;
  primaryPhotoUrl?: string | null;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

export * from './tree-view';
export * from './map';
export * from './gamification';
export * from './photo-intelligence';
export * from './matching';
export * from './family-stories';
export * from './ai-storytelling';
export * from './commercial';
export * from './privacy';
export * from './privacy-audit';
export * from './mfa';
export * from './admin-ops';
export * from './collaboration';
export * from './knowledge-quality';
export * from './media-ai';
export * from './webhooks';
export * from './external-archives';
export * from './experience-block';
