/** PROMPT 10 — Public Family Stories shared contracts */

export const STORY_VISIBILITY_LEVELS = ['public', 'private', 'family_only', 'link_only'] as const;
export type StoryVisibilityLevel = (typeof STORY_VISIBILITY_LEVELS)[number];

export const FAMILY_STORY_PUBLISH_STATUSES = [
  'draft',
  'pending_review',
  'published',
  'rejected',
] as const;
export type FamilyStoryPublishStatusId = (typeof FAMILY_STORY_PUBLISH_STATUSES)[number];

export const FAMILY_STORY_TEMPLATES = ['classic', 'heritage', 'journey', 'gallery'] as const;
export type FamilyStoryTemplateId = (typeof FAMILY_STORY_TEMPLATES)[number];

export const FAMILY_STORY_SCOPE_TYPES = ['person', 'family_branch'] as const;
export type FamilyStoryScopeTypeId = (typeof FAMILY_STORY_SCOPE_TYPES)[number];

export interface FamilyStoryCustomBlock {
  id: string;
  title: string;
  markdown: string;
}

export interface FamilyStorySectionsConfig {
  timeline: { enabled: boolean; personIds?: string[] };
  map: { enabled: boolean; personId?: string | null; familyId?: string | null };
  media: { enabled: boolean; mediaIds: string[] };
  documents: { enabled: boolean; documentIds: string[] };
  narrative: { enabled: boolean };
  customBlocks: FamilyStoryCustomBlock[];
}

export interface FamilyStoryConfig {
  sections: FamilyStorySectionsConfig;
}

export interface FamilyStorySummaryDto {
  id: string;
  title: string;
  template: FamilyStoryTemplateId;
  visibility: StoryVisibilityLevel;
  scopeType: FamilyStoryScopeTypeId;
  scopePersonId?: string | null;
  scopeFamilyId?: string | null;
  hideLivingPersons: boolean;
  viewCount: number;
  publishStatus: FamilyStoryPublishStatusId;
  publishedAt?: string | null;
  submittedForReviewAt?: string | null;
  moderationNote?: string | null;
  publicUrl?: string | null;
  slug?: string | null;
  tokenRevokedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FamilyStoryDetailDto extends FamilyStorySummaryDto {
  config: FamilyStoryConfig;
  narrativeText?: string | null;
  narrativeGeneratedAt?: string | null;
  coverMediaId?: string | null;
  ogDescription?: string | null;
  workspaceId?: string | null;
}

export interface FamilyStoryCreateResultDto extends FamilyStoryDetailDto {
  /** Raw token — shown once on create / rotate */
  publicToken: string;
}

export interface PublicStoryPersonDto {
  id: string;
  displayName: string;
  birthYear?: number | null;
  deathYear?: number | null;
  isHidden: boolean;
  avatarUrl?: string | null;
}

export interface PublicStoryTimelineEntryDto {
  id: string;
  title: string;
  date?: string | null;
  description?: string | null;
  type: string;
}

export interface PublicStoryMediaDto {
  id: string;
  title?: string | null;
  url?: string | null;
  mimeType?: string | null;
}

export interface PublicStoryDocumentDto {
  id: string;
  title: string;
  mimeType?: string | null;
  previewUrl?: string | null;
}

export interface FamilyStoryModerationQueueItemDto {
  id: string;
  title: string;
  visibility: StoryVisibilityLevel;
  publishStatus: FamilyStoryPublishStatusId;
  slug?: string | null;
  submittedForReviewAt?: string | null;
  createdBy: { id: string; displayName: string | null; email: string };
  coverUrl?: string | null;
}

export interface PublicFamilyStoryPayloadDto {
  id: string;
  title: string;
  template: FamilyStoryTemplateId;
  visibility: StoryVisibilityLevel;
  publishStatus: FamilyStoryPublishStatusId;
  slug?: string | null;
  narrativeText?: string | null;
  ogDescription?: string | null;
  coverUrl?: string | null;
  hideLivingPersons: boolean;
  persons: PublicStoryPersonDto[];
  timeline: PublicStoryTimelineEntryDto[];
  map?: import('./map').MapPayload | null;
  media: PublicStoryMediaDto[];
  documents: PublicStoryDocumentDto[];
  customBlocks: FamilyStoryCustomBlock[];
  viewCount: number;
  updatedAt?: string;
  publishedAt?: string | null;
}

/** Indexable PUBLIC stories for sitemap.xml (slug URLs only — no secret tokens). */
export interface PublicStorySitemapEntryDto {
  slug: string;
  updatedAt: string;
  publishedAt?: string | null;
}

export interface PublicStorySitemapDto {
  entries: PublicStorySitemapEntryDto[];
}
