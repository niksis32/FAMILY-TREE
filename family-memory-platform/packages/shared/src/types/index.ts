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
  familyName?: string | null;
  birthDate?: string | null;
  deathDate?: string | null;
  gender?: string | null;
  primaryPhotoUrl?: string | null;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}
