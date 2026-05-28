import { IsIn, IsOptional, IsString, IsNumber, IsArray } from 'class-validator';

const STORY_MODES = ['dry_biography', 'artistic', 'archive', 'family_book'] as const;
type StoryModeId = (typeof STORY_MODES)[number];

function isMode(v: string): v is StoryModeId {
  return (STORY_MODES as readonly string[]).includes(v);
}

export class GeneratePersonStoryDto {
  @IsOptional()
  @IsString()
  @IsIn(STORY_MODES)
  mode?: StoryModeId;

  @IsOptional()
  @IsString()
  language?: string;
}

export class GenerateTimelineNarrativeDto {
  @IsOptional()
  @IsString()
  @IsIn(STORY_MODES)
  mode?: StoryModeId;

  @IsOptional()
  @IsString()
  language?: string;
}

export class GenerateDocumentSummaryStoryDto {
  @IsOptional()
  @IsString()
  @IsIn(STORY_MODES)
  mode?: StoryModeId;

  @IsOptional()
  @IsString()
  language?: string;
}

export class GenerateFamilyStoryDto {
  @IsOptional()
  @IsString()
  @IsIn(STORY_MODES)
  mode?: StoryModeId;

  @IsOptional()
  @IsString()
  language?: string;
}

export class GenerateMigrationStoryDto {
  @IsOptional()
  @IsString()
  @IsIn(STORY_MODES)
  mode?: StoryModeId;

  @IsOptional()
  @IsString()
  language?: string;

  @IsOptional()
  @IsString()
  personId?: string;

  @IsOptional()
  @IsString()
  familyId?: string;

  /** Optional multi-person scope for migration narrative */
  @IsOptional()
  @IsArray()
  personIds?: string[];
}

export class GenerateEraContextDto {
  @IsOptional()
  @IsString()
  @IsIn(STORY_MODES)
  mode?: StoryModeId;

  @IsOptional()
  @IsString()
  language?: string;

  @IsOptional()
  @IsString()
  personId?: string;

  @IsOptional()
  @IsString()
  familyId?: string;

  @IsOptional()
  @IsOptional()
  @IsNumber()
  yearFrom?: number;

  @IsOptional()
  @IsNumber()
  yearTo?: number;
}

export class UpdateStoryDraftDto {
  @IsOptional()
  @IsString()
  narrative?: string;

  @IsOptional()
  paragraphs?: unknown;
}

export function normalizeMode(input?: string): StoryModeId {
  if (typeof input === 'string' && isMode(input)) return input;
  return 'dry_biography';
}

export function normalizeLanguage(input?: string): string {
  if (typeof input === 'string' && input.trim()) return input.trim();
  return 'ru';
}

