import type { PersonSummary } from '@family/shared';

export type PrivacyLevel = 'public' | 'family' | 'private';

export interface FamilySummary {
  id: string;
  title: string;
  membersCount: number;
  generations: number;
  privacy: PrivacyLevel;
}

export interface TimelineEvent {
  id: string;
  title: string;
  date: string;
  place?: string;
  type: 'birth' | 'marriage' | 'migration' | 'memory' | 'document';
  description: string;
}

export interface MediaItem {
  id: string;
  title: string;
  type: 'photo' | 'video' | 'audio';
  owner: string;
  privacy: PrivacyLevel;
}

export interface DocumentItem {
  id: string;
  title: string;
  type: string;
  date: string;
  status: 'processed' | 'ocr_pending' | 'needs_review';
  privacy: PrivacyLevel;
}

export const persons: PersonSummary[] = [
  {
    id: 'p1',
    givenName: 'Анна',
    familyName: 'Волкова',
    birthDate: '1958-04-12',
    deathDate: null,
    gender: 'female',
    primaryPhotoUrl: null,
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  },
  {
    id: 'p2',
    givenName: 'Михаил',
    familyName: 'Волков',
    birthDate: '1955-09-03',
    deathDate: null,
    gender: 'male',
    primaryPhotoUrl: null,
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  },
  {
    id: 'p3',
    givenName: 'Елена',
    familyName: 'Орлова',
    birthDate: '1984-02-20',
    deathDate: null,
    gender: 'female',
    primaryPhotoUrl: null,
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  },
  {
    id: 'p4',
    givenName: 'Даниил',
    familyName: 'Орлов',
    birthDate: '2012-07-11',
    deathDate: null,
    gender: 'male',
    primaryPhotoUrl: null,
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  },
];

export const families: FamilySummary[] = [
  { id: 'f1', title: 'Волковы - Орловы', membersCount: 42, generations: 5, privacy: 'family' },
  { id: 'f2', title: 'Архив линии Смирновых', membersCount: 18, generations: 4, privacy: 'private' },
];

export const timelineEvents: TimelineEvent[] = [
  {
    id: 't1',
    title: 'Рождение Анны Волковой',
    date: '1958',
    place: 'Казань',
    type: 'birth',
    description: 'Первая подтверждённая запись в семейном архиве.',
  },
  {
    id: 't2',
    title: 'Переезд семьи',
    date: '1981',
    place: 'Москва',
    type: 'migration',
    description: 'Смена города и начало новой ветви семейной истории.',
  },
  {
    id: 't3',
    title: 'Оцифровка фотоархива',
    date: '2025',
    type: 'memory',
    description: 'Добавлены первые фото, видео и голосовые истории.',
  },
];

export const mediaItems: MediaItem[] = [
  { id: 'm1', title: 'Семейный альбом 1980-х', type: 'photo', owner: 'Анна Волкова', privacy: 'family' },
  { id: 'm2', title: 'Видео встречи поколений', type: 'video', owner: 'Елена Орлова', privacy: 'private' },
  { id: 'm3', title: 'Голосовая история бабушки', type: 'audio', owner: 'Анна Волкова', privacy: 'family' },
];

export const documents: DocumentItem[] = [
  { id: 'd1', title: 'Свидетельство о рождении', type: 'Архив', date: '1958', status: 'processed', privacy: 'private' },
  { id: 'd2', title: 'Письмо из семейного архива', type: 'Письмо', date: '1979', status: 'ocr_pending', privacy: 'family' },
  { id: 'd3', title: 'Метрическая запись', type: 'Источник', date: '1912', status: 'needs_review', privacy: 'private' },
];
