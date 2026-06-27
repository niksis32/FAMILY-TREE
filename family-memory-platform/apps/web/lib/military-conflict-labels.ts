import type { AppLocale } from '@family/shared';

/** Locales where WW2 is referred to as the Great Patriotic War (ВОВ). */
export const POST_SOVIET_LOCALES = new Set<string>([
  'ru',
  'uk',
  'be',
  'kk',
  'uz',
  'ky',
  'tg',
  'tk',
  'az',
  'hy',
  'ka',
  'mo',
  'et',
  'lv',
  'lt',
]);

export type BuiltinConflictId = 'ww1' | 'civil' | 'ww2' | 'local';

export const BUILTIN_CONFLICTS: Array<{ id: BuiltinConflictId; color: string }> = [
  { id: 'ww1', color: '#8b5a2b' },
  { id: 'civil', color: '#9f1239' },
  { id: 'ww2', color: '#b45309' },
  { id: 'local', color: '#2563eb' },
];

export function isPostSovietLocale(locale: string): boolean {
  const base = locale.split('-')[0]?.toLowerCase() ?? 'en';
  return POST_SOVIET_LOCALES.has(base);
}

type ConflictTranslator = (key: string) => string;

export function getBuiltinConflictLabel(
  id: BuiltinConflictId,
  locale: AppLocale | string,
  t: ConflictTranslator,
): string {
  if (id === 'ww2') {
    return isPostSovietLocale(locale) ? t('conflicts.ww2Patriotic') : t('conflicts.ww2');
  }
  return t(`conflicts.${id}`);
}
