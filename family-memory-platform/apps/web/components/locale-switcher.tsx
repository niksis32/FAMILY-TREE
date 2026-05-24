'use client';

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { usePathname, useRouter } from '@/i18n/navigation';
import { APP_LOCALE_LABELS, APP_LOCALE_PRIORITY, APP_LOCALES, type AppLocale } from '@family/shared';
import { LocaleFlag } from '@/components/locale-flag';
import { Input } from '@/components/ui';
import {
  activeSwitcherCode,
  expandLocalesForSwitcher,
  readStoredEnglishVariant,
  switcherCodeToAppLocale,
  writeStoredEnglishVariant,
  type EnglishUiVariant,
} from '@/lib/locale-switcher-variants';
import { cn } from '@/lib/utils';

const popularSet = new Set(APP_LOCALE_PRIORITY);
const switcherLocales = expandLocalesForSwitcher(APP_LOCALES);

const SWITCHER_LABEL_KEY: Record<string, 'enGb' | 'enUs'> = {
  'en-gb': 'enGb',
  'en-us': 'enUs',
};

const SWITCHER_SEARCH_ALIASES: Record<string, string> = {
  'en-gb': 'english united kingdom britain uk british',
  'en-us': 'english united states america usa us american',
};

type LocaleEntry = {
  code: string;
  label: string;
  englishLabel: string;
  popular: boolean;
};

function normalizeSearch(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');
}

function isPopularSwitcherCode(code: string): boolean {
  if (code === 'en-gb' || code === 'en-us') return popularSet.has('en');
  return popularSet.has(code);
}

function localeLabel(
  code: string,
  tLocale: ReturnType<typeof useTranslations<'localeNames'>>,
): string {
  const labelKey = SWITCHER_LABEL_KEY[code];
  if (labelKey && tLocale.has(labelKey)) {
    return tLocale(labelKey);
  }
  if (tLocale.has(code as 'en')) {
    return tLocale(code as 'en');
  }
  return APP_LOCALE_LABELS[code] ?? APP_LOCALE_LABELS.en ?? code;
}

function buildEntry(
  code: string,
  tLocale: ReturnType<typeof useTranslations<'localeNames'>>,
): LocaleEntry {
  const englishLabel =
    SWITCHER_SEARCH_ALIASES[code] ?? APP_LOCALE_LABELS[code] ?? APP_LOCALE_LABELS.en ?? code;
  return {
    code,
    label: localeLabel(code, tLocale),
    englishLabel,
    popular: isPopularSwitcherCode(code),
  };
}

function LocaleOption({
  entry,
  selected,
  onSelect,
}: {
  entry: LocaleEntry;
  selected: boolean;
  onSelect: (code: string) => void;
}) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      className={cn(
        'flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition',
        selected
          ? 'bg-family-accent/20 font-medium text-family-primary dark:text-amber-200'
          : 'text-stone-700 hover:bg-stone-100 dark:text-slate-200 dark:hover:bg-slate-800',
      )}
      onClick={() => onSelect(entry.code)}
    >
      <LocaleFlag locale={entry.code} />
      <span className="min-w-0 flex-1 truncate">{entry.label}</span>
    </button>
  );
}

export function LocaleSwitcher() {
  const locale = useLocale() as AppLocale;
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations('common');
  const tLocale = useTranslations('localeNames');
  const tGroups = useTranslations('localeGroups');
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [englishVariant, setEnglishVariant] = useState<EnglishUiVariant>('en-gb');

  useEffect(() => {
    if (locale === 'en') {
      setEnglishVariant(readStoredEnglishVariant());
    }
  }, [locale]);

  const activeCode = activeSwitcherCode(locale, englishVariant);

  const allEntries = useMemo(
    () => switcherLocales.map((code) => buildEntry(code, tLocale)),
    [tLocale],
  );

  const entryByCode = useMemo(() => new Map(allEntries.map((e) => [e.code, e])), [allEntries]);

  const current = entryByCode.get(activeCode) ?? buildEntry(activeCode, tLocale);

  const normalizedQuery = normalizeSearch(query);

  const filtered = useMemo(() => {
    if (!normalizedQuery) return allEntries;
    return allEntries.filter((entry) => {
      const haystack = normalizeSearch(`${entry.label} ${entry.englishLabel} ${entry.code}`);
      return haystack.includes(normalizedQuery);
    });
  }, [allEntries, normalizedQuery]);

  const filteredPopular = useMemo(() => filtered.filter((e) => e.popular), [filtered]);
  const filteredOther = useMemo(() => filtered.filter((e) => !e.popular), [filtered]);

  const selectLocale = useCallback(
    (code: string) => {
      setOpen(false);
      setQuery('');

      const nextAppLocale = switcherCodeToAppLocale(code);
      if (code === 'en-gb' || code === 'en-us') {
        writeStoredEnglishVariant(code);
        setEnglishVariant(code);
      }

      if (nextAppLocale !== locale) {
        router.replace(pathname, { locale: nextAppLocale });
      }
    },
    [locale, pathname, router],
  );

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    const timer = window.setTimeout(() => searchRef.current?.focus(), 0);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
      window.clearTimeout(timer);
    };
  }, [open]);

  const showGroups = !normalizedQuery;

  return (
    <div ref={rootRef} className="relative text-sm text-stone-600 dark:text-slate-300">
      <span id={`${listId}-label`} className="mr-2 hidden sm:inline">
        {t('language')}
      </span>
      <button
        type="button"
        aria-labelledby={`${listId}-label`}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="inline-flex max-w-[min(100%,18rem)] items-center gap-2 rounded border border-stone-300 bg-white px-2 py-1 text-sm dark:border-slate-600 dark:bg-slate-900"
        onClick={() => setOpen((value) => !value)}
      >
        <LocaleFlag locale={activeCode} />
        <span className="truncate">{current.label}</span>
        <span className="ml-auto text-xs text-stone-400" aria-hidden>
          ▾
        </span>
      </button>

      {open ? (
        <div
          className="absolute right-0 z-50 mt-1 flex w-[min(100vw-2rem,20rem)] flex-col overflow-hidden rounded-xl border border-stone-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900"
          role="presentation"
        >
          <div className="border-b border-stone-100 p-2 dark:border-slate-800">
            <Input
              ref={searchRef}
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t('searchLanguage')}
              aria-label={t('searchLanguage')}
              className="py-2 text-sm"
              autoComplete="off"
              spellCheck={false}
            />
          </div>

          <ul
            id={listId}
            role="listbox"
            aria-labelledby={`${listId}-label`}
            className="max-h-72 overflow-y-auto p-1"
          >
            {filtered.length === 0 ? (
              <li className="px-3 py-4 text-center text-sm text-stone-500 dark:text-slate-400">
                {t('noLanguagesFound')}
              </li>
            ) : showGroups ? (
              <>
                {filteredPopular.length > 0 ? (
                  <li role="presentation" className="mb-1">
                    <p className="px-2 py-1 text-xs font-semibold uppercase tracking-wide text-stone-400 dark:text-slate-500">
                      {tGroups('popular')}
                    </p>
                    <ul className="space-y-0.5">
                      {filteredPopular.map((entry) => (
                        <li key={entry.code} role="presentation">
                          <LocaleOption
                            entry={entry}
                            selected={entry.code === activeCode}
                            onSelect={selectLocale}
                          />
                        </li>
                      ))}
                    </ul>
                  </li>
                ) : null}
                {filteredOther.length > 0 ? (
                  <li role="presentation">
                    <p className="px-2 py-1 text-xs font-semibold uppercase tracking-wide text-stone-400 dark:text-slate-500">
                      {tGroups('all')}
                    </p>
                    <ul className="space-y-0.5">
                      {filteredOther.map((entry) => (
                        <li key={entry.code} role="presentation">
                          <LocaleOption
                            entry={entry}
                            selected={entry.code === activeCode}
                            onSelect={selectLocale}
                          />
                        </li>
                      ))}
                    </ul>
                  </li>
                ) : null}
              </>
            ) : (
              filtered.map((entry) => (
                <li key={entry.code} role="presentation">
                  <LocaleOption
                    entry={entry}
                    selected={entry.code === activeCode}
                    onSelect={selectLocale}
                  />
                </li>
              ))
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
