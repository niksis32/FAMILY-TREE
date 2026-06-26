'use client';

import { useEffect, useState } from 'react';
import { ChevronDown, LogOut, Menu, Moon, Sun, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/navigation';
import { useAuth } from '@/components/auth-provider';
import { LocaleSwitcher } from '@/components/locale-switcher';
import { useTheme } from '@/components/theme-provider';
import { CommandPalette } from '@/components/command-palette';
import { NotificationBell } from '@/features/notifications/notification-bell';
import { OfflineBadge } from '@/components/pwa/offline-badge';
import { Button } from '@/components/ui';
import { cn } from '@/lib/utils';
import {
  PLATFORM_DASHBOARD,
  PLATFORM_NAV_GROUPS,
  PLATFORM_SETTINGS,
  type PlatformNavGroup,
  type PlatformNavItem,
} from '@/config/platform-navigation';

type NavGroupKey = PlatformNavGroup['groupKey'];

function groupHasActiveItem(pathname: string, group: PlatformNavGroup) {
  return group.items.some((item) => isNavActive(pathname, item));
}

function isNavActive(pathname: string, item: PlatformNavItem) {
  if (item.match) return item.match(pathname);
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

function NavLink({ item, pathname, onNavigate }: { item: PlatformNavItem; pathname: string; onNavigate?: () => void }) {
  const tNav = useTranslations('nav');
  const active = isNavActive(pathname, item);
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={cn(
        'flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-sm font-medium transition duration-200',
        active
          ? 'bg-family-primary text-white shadow-md shadow-family-primary/20 dark:bg-family-accent dark:text-family-ink'
          : 'text-stone-600 hover:bg-stone-100/90 hover:text-family-primary dark:text-slate-300 dark:hover:bg-slate-800/80 dark:hover:text-white',
      )}
    >
      <Icon className={cn('h-[1.125rem] w-[1.125rem] shrink-0', active && 'opacity-100')} aria-hidden />
      <span className="truncate">{tNav(item.key)}</span>
    </Link>
  );
}

function NavGroupSection({
  group,
  pathname,
  expanded,
  onToggle,
  onNavigate,
}: {
  group: PlatformNavGroup;
  pathname: string;
  expanded: boolean;
  onToggle: () => void;
  onNavigate?: () => void;
}) {
  const tNav = useTranslations('nav');
  const panelId = `nav-group-${group.groupKey}`;

  return (
    <div>
      <button
        type="button"
        id={`${panelId}-trigger`}
        aria-expanded={expanded}
        aria-controls={panelId}
        onClick={onToggle}
        className="mb-1 flex w-full items-center justify-between rounded-xl px-3 py-1.5 text-left transition-colors hover:bg-stone-100/80 dark:hover:bg-slate-800/60"
      >
        <span className="text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-stone-400 dark:text-slate-500">
          {tNav(`groups.${group.groupKey}`)}
        </span>
        <ChevronDown
          className={cn(
            'h-3.5 w-3.5 shrink-0 text-stone-400 transition-transform duration-300 ease-in-out dark:text-slate-500',
            expanded && 'rotate-180',
          )}
          aria-hidden
        />
      </button>
      <div
        id={panelId}
        role="region"
        aria-labelledby={`${panelId}-trigger`}
        className={cn(
          'grid transition-[grid-template-rows] duration-300 ease-in-out',
          expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
        )}
      >
        <div className="overflow-hidden">
          <div className="space-y-1 pb-1">
            {group.items.map((item) => (
              <NavLink key={item.href} item={item} pathname={pathname} onNavigate={onNavigate} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function SidebarContent({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  const tShell = useTranslations('shell');
  const [expandedGroups, setExpandedGroups] = useState<Record<NavGroupKey, boolean>>(() =>
    Object.fromEntries(PLATFORM_NAV_GROUPS.map((group) => [group.groupKey, true])) as Record<NavGroupKey, boolean>,
  );

  useEffect(() => {
    setExpandedGroups((prev) => {
      const next = { ...prev };
      let changed = false;

      for (const group of PLATFORM_NAV_GROUPS) {
        if (groupHasActiveItem(pathname, group) && !next[group.groupKey]) {
          next[group.groupKey] = true;
          changed = true;
        }
      }

      return changed ? next : prev;
    });
  }, [pathname]);

  const toggleGroup = (groupKey: NavGroupKey) => {
    setExpandedGroups((prev) => ({ ...prev, [groupKey]: !prev[groupKey] }));
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <Link
        href="/dashboard"
        onClick={onNavigate}
        className="block shrink-0 rounded-[1.35rem] border border-family-accent/25 bg-gradient-to-br from-family-primary to-slate-900 p-5 text-white shadow-premium"
      >
        <p className="font-serif text-xs font-medium uppercase tracking-[0.32em] text-family-accent">{tShell('brandTag')}</p>
        <h2 className="font-serif mt-2 text-2xl font-semibold leading-tight">{tShell('brandTitle')}</h2>
        <p className="mt-2 text-sm text-white/75">{tShell('tagline')}</p>
      </Link>

      <nav
        className="mt-6 min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-contain pr-1 [-ms-overflow-style:none] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-stone-300/80 dark:[&::-webkit-scrollbar-thumb]:bg-slate-600/80"
        aria-label={tShell('mainNav')}
      >
        <div>
          <NavLink item={PLATFORM_DASHBOARD} pathname={pathname} onNavigate={onNavigate} />
        </div>

        {PLATFORM_NAV_GROUPS.map((group) => (
          <NavGroupSection
            key={group.groupKey}
            group={group}
            pathname={pathname}
            expanded={expandedGroups[group.groupKey]}
            onToggle={() => toggleGroup(group.groupKey)}
            onNavigate={onNavigate}
          />
        ))}

        <div className="border-t border-stone-200/80 pt-4 dark:border-slate-800">
          <NavLink item={PLATFORM_SETTINGS} pathname={pathname} onNavigate={onNavigate} />
        </div>
      </nav>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { session, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const tShell = useTranslations('shell');
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top_left,rgba(201,162,39,0.12),transparent_42%),linear-gradient(160deg,#fbfaf8_0%,#f3f0ea_45%,#eef2f7_100%)] dark:bg-[radial-gradient(ellipse_at_top_left,rgba(201,162,39,0.14),transparent_38%),linear-gradient(160deg,#020617_0%,#0f172a_50%,#111827_100%)]">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[17.5rem] flex-col border-r border-stone-200/60 bg-white/75 p-4 backdrop-blur-2xl dark:border-slate-800/80 dark:bg-slate-950/75 lg:flex">
        <SidebarContent pathname={pathname} />
      </aside>

      {mobileOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-family-ink/40 backdrop-blur-sm"
            aria-label={tShell('closeMenu')}
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 flex w-[min(100%,18rem)] flex-col overflow-hidden border-r bg-white/95 p-4 shadow-2xl dark:bg-slate-950">
            <div className="mb-4 flex shrink-0 justify-end">
              <Button variant="ghost" onClick={() => setMobileOpen(false)} aria-label={tShell('closeMenu')}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="min-h-0 flex-1">
              <SidebarContent pathname={pathname} onNavigate={() => setMobileOpen(false)} />
            </div>
          </aside>
        </div>
      ) : null}

      <div className="min-w-0 lg:pl-[17.5rem]">
        <header className="sticky top-0 z-20 border-b border-stone-200/70 bg-white/75 px-3 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur-2xl dark:border-slate-800/80 dark:bg-slate-950/75 sm:px-4 md:px-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-2 sm:gap-3">
              <Button
                variant="ghost"
                className="shrink-0 px-2.5 lg:hidden"
                onClick={() => setMobileOpen(true)}
                aria-label={tShell('openMenu')}
              >
                <Menu className="h-5 w-5" />
              </Button>
              <div className="min-w-0">
                <p className="text-[0.65rem] font-semibold uppercase tracking-[0.28em] text-stone-400">{tShell('workspaceLabel')}</p>
                <p className="font-serif mt-0.5 truncate text-base font-semibold text-family-ink dark:text-white">
                  {session?.user.displayName ?? tShell('defaultDisplayName')}
                </p>
              </div>
            </div>
            <div className="flex min-w-0 flex-wrap items-center justify-end gap-2 overflow-visible sm:flex-nowrap">
              <OfflineBadge />
              <CommandPalette />
              <NotificationBell />
              <LocaleSwitcher />
              <Button
                variant="secondary"
                className="shrink-0 px-3"
                onClick={toggleTheme}
                aria-label={theme === 'dark' ? tShell('lightTheme') : tShell('darkTheme')}
              >
                {theme === 'dark' ? (
                  <Sun className="h-4 w-4 sm:mr-2" aria-hidden />
                ) : (
                  <Moon className="h-4 w-4 sm:mr-2" aria-hidden />
                )}
                <span className="hidden sm:inline">{theme === 'dark' ? tShell('lightTheme') : tShell('darkTheme')}</span>
              </Button>
              <Button variant="ghost" className="shrink-0 px-3" onClick={logout} aria-label={tShell('logout')}>
                <LogOut className="h-4 w-4 sm:mr-2" aria-hidden />
                <span className="hidden sm:inline">{tShell('logout')}</span>
              </Button>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-[90rem] overflow-x-hidden px-3 py-6 sm:px-4 sm:py-8 md:px-8">{children}</main>
      </div>
    </div>
  );
}
