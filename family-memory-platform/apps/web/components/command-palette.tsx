'use client';

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import {
  FileText,
  Image,
  Search,
  Sparkles,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { useFocusTrap } from '@family/ui';
import { useAuth } from '@/components/auth-provider';
import {
  PLATFORM_DASHBOARD,
  PLATFORM_ADMIN,
  PLATFORM_NAV_GROUPS,
  PLATFORM_SETTINGS,
  type NavItemKey,
} from '@/config/platform-navigation';
import { apiClient, type SearchResultItem } from '@/lib/api-client';
import { cn } from '@/lib/utils';

type CommandKind = 'nav' | 'search' | 'action';

interface CommandEntry {
  id: string;
  kind: CommandKind;
  label: string;
  hint?: string;
  href?: string;
  icon: LucideIcon;
  run?: () => void;
}

function flattenNavCommands(tNav: (key: NavItemKey) => string, showAdmin: boolean): CommandEntry[] {
  const items: CommandEntry[] = [
    {
      id: `nav-${PLATFORM_DASHBOARD.href}`,
      kind: 'nav',
      label: tNav(PLATFORM_DASHBOARD.key),
      href: PLATFORM_DASHBOARD.href,
      icon: PLATFORM_DASHBOARD.icon,
    },
  ];
  for (const group of PLATFORM_NAV_GROUPS) {
    for (const item of group.items) {
      items.push({
        id: `nav-${item.href}`,
        kind: 'nav',
        label: tNav(item.key),
        href: item.href,
        icon: item.icon,
      });
    }
  }
  if (showAdmin) {
    items.push({
      id: `nav-${PLATFORM_ADMIN.href}`,
      kind: 'nav',
      label: tNav(PLATFORM_ADMIN.key),
      href: PLATFORM_ADMIN.href,
      icon: PLATFORM_ADMIN.icon,
    });
  }
  items.push({
    id: `nav-${PLATFORM_SETTINGS.href}`,
    kind: 'nav',
    label: tNav(PLATFORM_SETTINGS.key),
    href: PLATFORM_SETTINGS.href,
    icon: PLATFORM_SETTINGS.icon,
  });
  return items;
}

function searchResultHref(item: SearchResultItem): string | undefined {
  switch (item.category) {
    case 'people':
      return `/persons/${item.entityId}`;
    case 'documents':
      return `/documents/${item.entityId}/intelligence`;
    case 'places':
      return '/map';
    default:
      return '/search';
  }
}

export function CommandPalette() {
  const t = useTranslations('commandPalette');
  const tNav = useTranslations('nav');
  const router = useRouter();
  const { session } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();
  const titleId = useId();

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [searchHits, setSearchHits] = useState<SearchResultItem[]>([]);
  const [searching, setSearching] = useState(false);

  useFocusTrap(panelRef, open);

  const close = useCallback(() => setOpen(false), []);

  const staticCommands = useMemo(
    () => [
      ...flattenNavCommands(tNav, session?.user.role === 'ADMIN'),
      {
        id: 'action-add-person',
        kind: 'action' as const,
        label: t('addPerson'),
        href: '/persons',
        icon: Users,
      },
      {
        id: 'action-ai-lab',
        kind: 'action' as const,
        label: t('openAiLab'),
        href: '/ai-lab',
        icon: Sparkles,
      },
      {
        id: 'action-documents',
        kind: 'action' as const,
        label: t('openDocuments'),
        href: '/documents',
        icon: FileText,
      },
      {
        id: 'action-media',
        kind: 'action' as const,
        label: t('openMedia'),
        href: '/media',
        icon: Image,
      },
      {
        id: 'action-search-page',
        kind: 'action' as const,
        label: t('openSearchPage'),
        href: '/search',
        icon: Search,
      },
    ],
    [t, tNav, session?.user.role],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setActiveIndex(0);
    setSearchHits([]);
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open || query.trim().length < 2) {
      setSearchHits([]);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(() => {
      setSearching(true);
      void apiClient
        .search(query.trim(), session?.accessToken)
        .then((data) => {
          if (cancelled) return;
          const merged: SearchResultItem[] = [
            ...data.people,
            ...data.documents,
            ...data.places,
            ...data.sources,
          ];
          setSearchHits(merged.slice(0, 12));
        })
        .catch(() => {
          if (!cancelled) setSearchHits([]);
        })
        .finally(() => {
          if (!cancelled) setSearching(false);
        });
    }, 280);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, open, session?.accessToken]);

  const filteredStatic = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return staticCommands;
    return staticCommands.filter(
      (c) => c.label.toLowerCase().includes(q) || c.hint?.toLowerCase().includes(q),
    );
  }, [query, staticCommands]);

  const searchCommands: CommandEntry[] = useMemo(
    () =>
      searchHits.map((hit) => ({
        id: `search-${hit.category}-${hit.id}`,
        kind: 'search' as const,
        label: hit.title,
        hint: hit.text?.slice(0, 80) ?? hit.category,
        href: searchResultHref(hit),
        icon:
          hit.category === 'people'
            ? Users
            : hit.category === 'documents'
              ? FileText
              : Search,
      })),
    [searchHits],
  );

  const allCommands = useMemo(
    () => [...filteredStatic, ...searchCommands],
    [filteredStatic, searchCommands],
  );

  const activeOptionId =
    allCommands.length > 0 ? `${listboxId}-option-${allCommands[activeIndex]?.id ?? activeIndex}` : undefined;

  const execute = useCallback(
    (entry: CommandEntry) => {
      close();
      if (entry.href) router.push(entry.href);
      else entry.run?.();
    },
    [router, close],
  );

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  const triggerClass = (compact: boolean) =>
    cn(
      'items-center justify-center rounded-xl border transition',
      compact
        ? 'inline-flex h-10 w-10 shrink-0'
        : 'hidden gap-2 px-3 py-2 text-sm sm:inline-flex',
      open
        ? 'border-family-accent/40 bg-family-accent/10 font-medium text-family-primary dark:text-family-accent'
        : 'border-stone-200/80 bg-white/80 text-stone-500 hover:border-family-accent/40 hover:text-family-primary dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-400 dark:hover:text-family-accent',
    );

  const triggerProps = {
    type: 'button' as const,
    onClick: () => setOpen(true),
    'aria-haspopup': 'dialog' as const,
    'aria-expanded': open,
    'aria-controls': open ? listboxId : undefined,
    'aria-label': t('triggerLabel'),
  };

  const mobileTrigger = (
    <button {...triggerProps} className={triggerClass(true)}>
      <Search className="h-4 w-4" aria-hidden />
    </button>
  );

  const desktopTrigger = (
    <button {...triggerProps} className={triggerClass(false)}>
      <Search className="h-4 w-4" aria-hidden />
      <span className="max-w-[10rem] truncate">{t('trigger')}</span>
      <kbd className="rounded-md border bg-stone-100 px-1.5 py-0.5 text-[0.65rem] font-semibold dark:bg-slate-800" aria-hidden>
        ⌘K
      </kbd>
    </button>
  );

  const modal =
    open && typeof document !== 'undefined' ? (
      <div className="fixed inset-0 z-[100] flex items-start justify-center p-3 pt-[max(1rem,env(safe-area-inset-top))] sm:p-4 sm:pt-[12vh]">
        <button
          type="button"
          className="absolute inset-0 bg-family-ink/45 backdrop-blur-sm"
          aria-label={t('close')}
          onClick={close}
        />
        <div
          ref={panelRef}
          tabIndex={-1}
          className="relative z-10 max-h-[min(92dvh,100%)] w-full max-w-xl overflow-hidden rounded-[1.25rem] border border-family-accent/20 bg-white shadow-2xl outline-none dark:bg-slate-950 sm:rounded-[1.5rem]"
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
        >
          <h2 id={titleId} className="sr-only">
            {t('title')}
          </h2>
          <div className="flex items-center gap-3 border-b border-stone-200/80 px-4 py-3 dark:border-slate-800">
            <Search className="h-5 w-5 shrink-0 text-family-accent" aria-hidden />
            <input
              ref={inputRef}
              id={`${listboxId}-input`}
              type="search"
              role="combobox"
              aria-expanded
              aria-controls={listboxId}
              aria-activedescendant={activeOptionId}
              aria-autocomplete="list"
              aria-label={t('searchLabel')}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('placeholder')}
              className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-stone-400"
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  e.preventDefault();
                  close();
                  return;
                }
                if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  setActiveIndex((i) => Math.min(i + 1, allCommands.length - 1));
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  setActiveIndex((i) => Math.max(i - 1, 0));
                } else if (e.key === 'Enter' && allCommands[activeIndex]) {
                  e.preventDefault();
                  execute(allCommands[activeIndex]);
                }
              }}
            />
            <kbd className="hidden rounded border px-1.5 text-xs text-stone-400 sm:inline" aria-hidden>
              Esc
            </kbd>
          </div>

          <ul
            id={listboxId}
            role="listbox"
            aria-label={t('resultsLabel')}
            className="max-h-[min(24rem,50vh)] overflow-y-auto p-2"
          >
            {allCommands.length === 0 ? (
              <li className="px-3 py-8 text-center text-sm text-stone-500" role="presentation">
                {searching ? t('searching') : t('noResults')}
              </li>
            ) : (
              allCommands.map((entry, index) => {
                const Icon = entry.icon;
                const optionId = `${listboxId}-option-${entry.id}`;
                return (
                  <li key={entry.id} role="presentation">
                    <button
                      id={optionId}
                      type="button"
                      role="option"
                      aria-selected={index === activeIndex}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition',
                        index === activeIndex
                          ? 'bg-family-primary text-white dark:bg-family-accent dark:text-family-ink'
                          : 'text-stone-700 hover:bg-stone-100 dark:text-slate-200 dark:hover:bg-slate-900',
                      )}
                      onMouseEnter={() => setActiveIndex(index)}
                      onClick={() => execute(entry)}
                    >
                      <Icon className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{entry.label}</span>
                        {entry.hint ? (
                          <span
                            className={cn(
                              'block truncate text-xs',
                              index === activeIndex ? 'opacity-80' : 'text-stone-400',
                            )}
                          >
                            {entry.hint}
                          </span>
                        ) : null}
                      </span>
                      <span className="text-[0.65rem] uppercase tracking-wider opacity-60" aria-hidden>
                        {entry.kind}
                      </span>
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      </div>
    ) : null;

  return (
    <>
      {mobileTrigger}
      {desktopTrigger}
      {modal ? createPortal(modal, document.body) : null}
    </>
  );
}
