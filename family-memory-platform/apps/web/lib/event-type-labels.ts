import type { TimelineEventType } from '@/lib/api-client';

/** Порядок вкладок фильтра на странице хронологии — «Смерть» в конце. */
export const TIMELINE_FILTER_TYPE_ORDER: TimelineEventType[] = [
  'birth',
  'marriage',
  'migration',
  'education',
  'military',
  'work',
  'custom',
  'death',
];

export function sortTimelineFilterTypes(types: TimelineEventType[]) {
  const order = TIMELINE_FILTER_TYPE_ORDER;
  return [...types].sort((a, b) => {
    const ai = order.indexOf(a);
    const bi = order.indexOf(b);
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
  });
}

export const API_EVENT_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: 'BIRTH', label: 'Рождение' },
  { value: 'MARRIAGE', label: 'Брак' },
  { value: 'DIVORCE', label: 'Развод' },
  { value: 'BURIAL', label: 'Захоронение' },
  { value: 'RESIDENCE', label: 'Проживание' },
  { value: 'MIGRATION', label: 'Миграция' },
  { value: 'EDUCATION', label: 'Образование' },
  { value: 'MILITARY', label: 'Военная служба' },
  { value: 'WORK', label: 'Работа' },
  { value: 'OCCUPATION', label: 'Занятость' },
  { value: 'IMMIGRATION', label: 'Иммиграция' },
  { value: 'CUSTOM', label: 'Другое' },
  { value: 'DEATH', label: 'Смерть' },
];

export function apiEventTypeLabel(type: string) {
  return API_EVENT_TYPE_OPTIONS.find((option) => option.value === type)?.label ?? type;
}
