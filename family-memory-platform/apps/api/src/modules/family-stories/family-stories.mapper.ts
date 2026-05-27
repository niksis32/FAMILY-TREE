import type {
  FamilyStoryConfig,
  FamilyStoryDetailDto,
  FamilyStorySummaryDto,
  FamilyStoryTemplateId,
  FamilyStoryScopeTypeId,
  StoryVisibilityLevel,
} from '@family/shared';
import type { FamilyStory } from '@prisma/client';
import { DEFAULT_STORY_CONFIG } from './family-stories.dto';

export function parseStoryConfig(raw: unknown): FamilyStoryConfig {
  if (raw && typeof raw === 'object' && 'sections' in (raw as object)) {
    return raw as FamilyStoryConfig;
  }
  return DEFAULT_STORY_CONFIG;
}

export function toVisibilityLevel(v: string): StoryVisibilityLevel {
  switch (v) {
    case 'PUBLIC':
      return 'public';
    case 'PRIVATE':
      return 'private';
    case 'FAMILY_ONLY':
      return 'family_only';
    default:
      return 'link_only';
  }
}

export function toTemplateId(t: string): FamilyStoryTemplateId {
  return t.toLowerCase() as FamilyStoryTemplateId;
}

export function toScopeTypeId(s: string): FamilyStoryScopeTypeId {
  return s === 'FAMILY_BRANCH' ? 'family_branch' : 'person';
}

export function toSummaryDto(story: FamilyStory, publicBaseUrl?: string): FamilyStorySummaryDto {
  const tokenPath = publicBaseUrl ? `${publicBaseUrl}` : undefined;
  return {
    id: story.id,
    title: story.title,
    template: toTemplateId(story.template),
    visibility: toVisibilityLevel(story.visibility),
    scopeType: toScopeTypeId(story.scopeType),
    scopePersonId: story.scopePersonId,
    scopeFamilyId: story.scopeFamilyId,
    hideLivingPersons: story.hideLivingPersons,
    viewCount: story.viewCount,
    publishedAt: story.publishedAt?.toISOString() ?? null,
    publicUrl: story.visibility === 'PUBLIC' && story.slug ? `/s/${story.slug}` : tokenPath,
    slug: story.slug,
    tokenRevokedAt: story.tokenRevokedAt?.toISOString() ?? null,
    createdAt: story.createdAt.toISOString(),
    updatedAt: story.updatedAt.toISOString(),
  };
}

export function toDetailDto(story: FamilyStory, publicBaseUrl?: string): FamilyStoryDetailDto {
  return {
    ...toSummaryDto(story, publicBaseUrl),
    config: parseStoryConfig(story.configJson),
    narrativeText: story.narrativeText,
    narrativeGeneratedAt: story.narrativeGeneratedAt?.toISOString() ?? null,
    coverMediaId: story.coverMediaId,
    ogDescription: story.ogDescription,
    workspaceId: story.workspaceId,
  };
}
