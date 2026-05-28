/** PROMPT 11 — AI Storytelling shared contracts */

export const STORY_MODES = ['dry_biography', 'artistic', 'archive', 'family_book'] as const;
export type StoryModeId = (typeof STORY_MODES)[number];

export const STORY_TYPES = [
  'person',
  'family',
  'migration',
  'document_summary',
  'timeline_narrative',
  'era_context',
] as const;
export type StoryTypeId = (typeof STORY_TYPES)[number];

export type StorySourceType = 'person' | 'event' | 'place' | 'document' | 'media' | 'system';

export interface StorySourceRef {
  sourceType: StorySourceType;
  sourceId?: string | null;
  /** Optional label for UI when entity is redacted or missing */
  label?: string | null;
}

export interface StoryClaim {
  id: string;
  text: string;
  /** True when the model could not ground the claim in sources */
  isAssumption: boolean;
  uncertainty?: number | null;
  uncertaintyNote?: string | null;
  sources: StorySourceRef[];
}

export interface StoryParagraph {
  id: string;
  text: string;
  /** claim ids referenced in this paragraph */
  claimIds?: string[];
}

export interface StoryDraftDto {
  id: string;
  storyType: StoryTypeId;
  mode: StoryModeId;
  language: string;
  title?: string | null;
  narrative: string;
  paragraphs: StoryParagraph[];
  claims: StoryClaim[];
  /** User-editable warnings that should be visible in UI */
  warnings: Array<{ kind: 'uncertainty' | 'assumption' | 'missing_source'; message: string }>;
  uncertaintyScore?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface GeneratePersonStoryRequestDto {
  mode?: StoryModeId;
  language?: string;
}

export interface GenerateTimelineNarrativeRequestDto {
  mode?: StoryModeId;
  language?: string;
}

export interface GenerateDocumentSummaryRequestDto {
  mode?: StoryModeId;
  language?: string;
}

export interface UpdateStoryDraftRequestDto {
  narrative?: string;
  paragraphs?: StoryParagraph[];
}

