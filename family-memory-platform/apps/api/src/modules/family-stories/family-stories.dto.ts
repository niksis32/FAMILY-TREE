import {
  FAMILY_STORY_SCOPE_TYPES,
  FAMILY_STORY_TEMPLATES,
  STORY_VISIBILITY_LEVELS,
  type FamilyStoryConfig,
} from '@family/shared';
import {
  IsBoolean,
  IsEnum,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import type { FamilyStoryScopeType, FamilyStoryTemplate, StoryVisibility } from '@prisma/client';

const templateValues = FAMILY_STORY_TEMPLATES.map((t) => t.toUpperCase()) as FamilyStoryTemplate[];
const visibilityValues = STORY_VISIBILITY_LEVELS.map((v) =>
  v === 'family_only' ? 'FAMILY_ONLY' : v.toUpperCase(),
) as StoryVisibility[];
const scopeValues = FAMILY_STORY_SCOPE_TYPES.map((s) =>
  s === 'family_branch' ? 'FAMILY_BRANCH' : s.toUpperCase(),
) as FamilyStoryScopeType[];

export class CreateFamilyStoryDto {
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  title!: string;

  @IsOptional()
  @IsIn(templateValues)
  template?: FamilyStoryTemplate;

  @IsOptional()
  @IsIn(visibilityValues)
  visibility?: StoryVisibility;

  @IsEnum(scopeValues)
  scopeType!: FamilyStoryScopeType;

  @IsOptional()
  @IsString()
  scopePersonId?: string;

  @IsOptional()
  @IsString()
  scopeFamilyId?: string;

  @IsOptional()
  @IsBoolean()
  hideLivingPersons?: boolean;

  @IsOptional()
  @IsString()
  workspaceId?: string;

  @IsOptional()
  @IsObject()
  config?: FamilyStoryConfig;

  @IsOptional()
  @IsString()
  coverMediaId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  ogDescription?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  slug?: string;
}

export class UpdateFamilyStoryDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsIn(templateValues)
  template?: FamilyStoryTemplate;

  @IsOptional()
  @IsIn(visibilityValues)
  visibility?: StoryVisibility;

  @IsOptional()
  @IsBoolean()
  hideLivingPersons?: boolean;

  @IsOptional()
  @IsObject()
  config?: FamilyStoryConfig;

  @IsOptional()
  @IsString()
  coverMediaId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  ogDescription?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  slug?: string | null;
}

export class GenerateNarrativeDto {
  @IsOptional()
  @IsString()
  language?: string;
}

export class PublicStoryBySlugQueryDto {
  @IsOptional()
  @IsString()
  token?: string;
}

export const DEFAULT_STORY_CONFIG: FamilyStoryConfig = {
  sections: {
    timeline: { enabled: true, personIds: [] },
    map: { enabled: true, personId: null, familyId: null },
    media: { enabled: true, mediaIds: [] },
    documents: { enabled: false, documentIds: [] },
    narrative: { enabled: true },
    customBlocks: [],
  },
};
