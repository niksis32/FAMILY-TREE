import { type AppLocale, normalizeAppLocale } from '@family/shared';

/** UI-only codes in the language picker (not URL locales). */
export const ENGLISH_UI_VARIANTS = ['en-gb', 'en-us'] as const;
export type EnglishUiVariant = (typeof ENGLISH_UI_VARIANTS)[number];

const STORAGE_KEY = 'family-memory.localeEnglishVariant';

export function isEnglishUiVariant(code: string): code is EnglishUiVariant {
  return code === 'en-gb' || code === 'en-us';
}

/** Maps picker code → next-intl / URL locale (en-gb and en-us → en). */
export function switcherCodeToAppLocale(code: string): AppLocale {
  if (code === 'en-gb' || code === 'en-us') return 'en';
  return normalizeAppLocale(code);
}

export function expandLocalesForSwitcher(codes: readonly string[]): string[] {
  const out: string[] = [];
  for (const code of codes) {
    if (code === 'en') {
      out.push('en-gb', 'en-us');
    } else {
      out.push(code);
    }
  }
  return out;
}

export function readStoredEnglishVariant(): EnglishUiVariant {
  if (typeof window === 'undefined') return 'en-gb';
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === 'en-us' ? 'en-us' : 'en-gb';
  } catch {
    return 'en-gb';
  }
}

export function writeStoredEnglishVariant(variant: EnglishUiVariant): void {
  try {
    localStorage.setItem(STORAGE_KEY, variant);
  } catch {
    /* ignore quota / private mode */
  }
}

/** Active row in the picker (en → stored en-gb | en-us). */
export function activeSwitcherCode(appLocale: string, englishVariant: EnglishUiVariant): string {
  if (appLocale === 'en') return englishVariant;
  return appLocale;
}
