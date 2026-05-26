import type { AchievementDefinition, QuestDefinition } from '../types/gamification';

/** Discovery score category weights (must sum to 100) */
export const DISCOVERY_SCORE_WEIGHTS = {
  persons: 25,
  relationships: 15,
  events: 15,
  documents: 15,
  citations: 10,
  media: 10,
  geo: 10,
} as const;

/** Static quest catalog — progress computed from tree metrics + user events */
export const QUEST_DEFINITIONS: QuestDefinition[] = [
  {
    id: 'birth-places-5',
    category: 'regional',
    titleKey: 'gamification.quests.birthPlaces5.title',
    descriptionKey: 'gamification.quests.birthPlaces5.description',
    target: 5,
    metric: 'personsWithBirthPlace',
    priority: 80,
  },
  {
    id: 'ancestor-document',
    category: 'document',
    titleKey: 'gamification.quests.ancestorDocument.title',
    descriptionKey: 'gamification.quests.ancestorDocument.description',
    target: 1,
    metric: 'ancestorDocuments',
    priority: 90,
  },
  {
    id: 'cite-relationship',
    category: 'document',
    titleKey: 'gamification.quests.citeRelationship.title',
    descriptionKey: 'gamification.quests.citeRelationship.description',
    target: 1,
    metric: 'sourcedRelationships',
    priority: 85,
  },
  {
    id: 'identify-photos-3',
    category: 'photo',
    titleKey: 'gamification.quests.identifyPhotos3.title',
    descriptionKey: 'gamification.quests.identifyPhotos3.description',
    target: 3,
    metric: 'identifiedPhotos',
    priority: 75,
  },
  {
    id: 'maternal-line-4',
    category: 'ancestor',
    titleKey: 'gamification.quests.maternalLine4.title',
    descriptionKey: 'gamification.quests.maternalLine4.description',
    target: 4,
    metric: 'maternalLineDepth',
    priority: 95,
  },
  {
    id: 'migration-route',
    category: 'migration',
    titleKey: 'gamification.quests.migrationRoute.title',
    descriptionKey: 'gamification.quests.migrationRoute.description',
    target: 1,
    metric: 'migrationRoutes',
    priority: 88,
  },
  {
    id: 'upload-archive',
    category: 'document',
    titleKey: 'gamification.quests.uploadArchive.title',
    descriptionKey: 'gamification.quests.uploadArchive.description',
    target: 1,
    metric: 'archiveDocuments',
    priority: 70,
  },
  {
    id: 'complete-profiles-10',
    category: 'missing-data',
    titleKey: 'gamification.quests.completeProfiles10.title',
    descriptionKey: 'gamification.quests.completeProfiles10.description',
    target: 10,
    metric: 'completeProfiles',
    priority: 65,
  },
  {
    id: 'regional-events-5',
    category: 'regional',
    titleKey: 'gamification.quests.regionalEvents5.title',
    descriptionKey: 'gamification.quests.regionalEvents5.description',
    target: 5,
    metric: 'eventsWithPlace',
    priority: 60,
  },
  {
    id: 'confirm-sources-3',
    category: 'document',
    titleKey: 'gamification.quests.confirmSources3.title',
    descriptionKey: 'gamification.quests.confirmSources3.description',
    target: 3,
    metric: 'citations',
    priority: 72,
  },
];

/** Weekly goal pool — 3 picked per ISO week */
export const WEEKLY_QUEST_IDS = [
  'birth-places-5',
  'identify-photos-3',
  'confirm-sources-3',
  'regional-events-5',
  'complete-profiles-10',
  'upload-archive',
] as const;

export const ACHIEVEMENT_DEFINITIONS: AchievementDefinition[] = [
  {
    id: 'first-document',
    tier: 'bronze',
    titleKey: 'gamification.achievements.firstDocument.title',
    descriptionKey: 'gamification.achievements.firstDocument.description',
    condition: 'documents >= 1',
  },
  {
    id: 'sourced-fact',
    tier: 'bronze',
    titleKey: 'gamification.achievements.sourcedFact.title',
    descriptionKey: 'gamification.achievements.sourcedFact.description',
    condition: 'citations >= 1',
  },
  {
    id: 'first-migration',
    tier: 'bronze',
    titleKey: 'gamification.achievements.firstMigration.title',
    descriptionKey: 'gamification.achievements.firstMigration.description',
    condition: 'migrationEvents >= 1',
  },
  {
    id: 'photo-archivist',
    tier: 'silver',
    titleKey: 'gamification.achievements.photoArchivist.title',
    descriptionKey: 'gamification.achievements.photoArchivist.description',
    condition: 'identifiedPhotos >= 5',
  },
  {
    id: 'migration-tracer',
    tier: 'silver',
    titleKey: 'gamification.achievements.migrationTracer.title',
    descriptionKey: 'gamification.achievements.migrationTracer.description',
    condition: 'migrationRoutes >= 1',
  },
  {
    id: 'four-generations',
    tier: 'gold',
    titleKey: 'gamification.achievements.fourGenerations.title',
    descriptionKey: 'gamification.achievements.fourGenerations.description',
    condition: 'maxLineDepth >= 4',
  },
  {
    id: 'archive-scholar',
    tier: 'gold',
    titleKey: 'gamification.achievements.archiveScholar.title',
    descriptionKey: 'gamification.achievements.archiveScholar.description',
    condition: 'ocrDocuments >= 3',
  },
  {
    id: 'complete-profile',
    tier: 'archive',
    titleKey: 'gamification.achievements.completeProfile.title',
    descriptionKey: 'gamification.achievements.completeProfile.description',
    condition: 'completeProfiles >= 1',
  },
];

/** Gamification activity action codes */
export const GAMIFICATION_ACTIONS = {
  PERSON_CREATE: 'person.create',
  PERSON_UPDATE: 'person.update',
  EVENT_CREATE: 'event.create',
  EVENT_UPDATE: 'event.update',
  DOCUMENT_CREATE: 'document.create',
  DOCUMENT_UPDATE: 'document.update',
  CITATION_CREATE: 'citation.create',
  MEDIA_LINK: 'media.link',
  MEDIA_CREATE: 'media.create',
  PHOTO_FACE_TAG: 'photo.face-tag',
  PHOTO_ANALYSIS_COMPLETE: 'photo.analysis-complete',
  RELATIONSHIP_UPDATE: 'relationship.update',
} as const;
