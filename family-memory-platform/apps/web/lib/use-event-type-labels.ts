'use client';

import { useTranslations } from 'next-intl';
import type { TimelineEventType } from '@/lib/api-client';

export const API_EVENT_TYPE_KEYS = [
  'BIRTH',
  'MARRIAGE',
  'DIVORCE',
  'BURIAL',
  'RESIDENCE',
  'MIGRATION',
  'EDUCATION',
  'MILITARY',
  'WORK',
  'OCCUPATION',
  'IMMIGRATION',
  'CUSTOM',
  'DEATH',
] as const;

export function useApiEventTypeOptions() {
  const t = useTranslations('eventTypes');
  return API_EVENT_TYPE_KEYS.map((value) => ({ value, label: t(value) }));
}

export function useApiEventTypeLabel() {
  const t = useTranslations('eventTypes');
  return (type: string) => {
    const key = type as (typeof API_EVENT_TYPE_KEYS)[number];
    if ((API_EVENT_TYPE_KEYS as readonly string[]).includes(type)) return t(key);
    return type;
  };
}

export function useTimelineEventTypeLabel() {
  const t = useTranslations('timelineEventTypes');
  return (type: TimelineEventType) => t(type);
}
