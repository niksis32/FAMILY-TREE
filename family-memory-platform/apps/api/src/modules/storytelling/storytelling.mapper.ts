import type { AiStoryDraft } from '@prisma/client';
import type { StoryDraftDto } from '@family/shared';

export function toStoryDraftDto(draft: AiStoryDraft): StoryDraftDto {
  const payload = draft.payloadJson as unknown;
  const obj = payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : {};

  const narrative =
    typeof obj.narrative === 'string'
      ? obj.narrative
      : typeof draft.narrativeText === 'string'
        ? draft.narrativeText
        : '';

  return {
    id: draft.id,
    storyType: toStoryTypeId(draft.storyType),
    mode: toStoryModeId(draft.mode),
    language: draft.language,
    title: draft.title ?? null,
    narrative,
    paragraphs: Array.isArray(obj.paragraphs) ? (obj.paragraphs as StoryDraftDto['paragraphs']) : [],
    claims: Array.isArray(obj.claims) ? (obj.claims as StoryDraftDto['claims']) : [],
    warnings: Array.isArray(obj.warnings) ? (obj.warnings as StoryDraftDto['warnings']) : [],
    uncertaintyScore: typeof draft.uncertaintyScore === 'number' ? draft.uncertaintyScore : null,
    factCheckScore: readFactCheckScore(obj),
    factCheckPassed: readFactCheckPassed(obj),
    createdAt: draft.createdAt.toISOString(),
    updatedAt: draft.updatedAt.toISOString(),
  };
}

function readFactCheckScore(obj: Record<string, unknown>): number | null {
  const service = obj.service && typeof obj.service === 'object' ? (obj.service as Record<string, unknown>) : null;
  const factCheck = service?.factCheck && typeof service.factCheck === 'object' ? (service.factCheck as Record<string, unknown>) : null;
  return typeof factCheck?.score === 'number' ? factCheck.score : null;
}

function readFactCheckPassed(obj: Record<string, unknown>): boolean | null {
  const service = obj.service && typeof obj.service === 'object' ? (obj.service as Record<string, unknown>) : null;
  const factCheck = service?.factCheck && typeof service.factCheck === 'object' ? (service.factCheck as Record<string, unknown>) : null;
  return typeof factCheck?.passed === 'boolean' ? factCheck.passed : null;
}

function toStoryTypeId(v: AiStoryDraft['storyType']): StoryDraftDto['storyType'] {
  switch (v) {
    case 'PERSON':
      return 'person';
    case 'FAMILY':
      return 'family';
    case 'MIGRATION':
      return 'migration';
    case 'DOCUMENT_SUMMARY':
      return 'document_summary';
    case 'TIMELINE_NARRATIVE':
      return 'timeline_narrative';
    case 'ERA_CONTEXT':
      return 'era_context';
    default:
      return 'person';
  }
}

function toStoryModeId(v: AiStoryDraft['mode']): StoryDraftDto['mode'] {
  switch (v) {
    case 'DRY_BIOGRAPHY':
      return 'dry_biography';
    case 'ARTISTIC':
      return 'artistic';
    case 'ARCHIVE':
      return 'archive';
    case 'FAMILY_BOOK':
      return 'family_book';
    default:
      return 'dry_biography';
  }
}

