'use client';

import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/navigation';
import { useAuth } from '@/components/auth-provider';
import { LocaleSwitcher } from '@/components/locale-switcher';
import { useTheme } from '@/components/theme-provider';
import { CommandPalette } from '@/components/command-palette';
import { Button } from '@/components/ui';
import { cn } from '@/lib/utils';
import {
  PLATFORM_DASHBOARD,
  PLATFORM_NAV_GROUPS,
  PLATFORM_SETTINGS,
  type PlatformNavItem,
} from '@/config/platform-navigation';

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

function SidebarContent({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  const tNav = useTranslations('nav');
  const tShell = useTranslations('shell');

  return (
    <>
      <Link
        href="/dashboard"
        onClick={onNavigate}
        className="block rounded-[1.35rem] border border-family-accent/25 bg-gradient-to-br from-family-primary to-slate-900 p-5 text-white shadow-premium"
      >
        <p className="font-serif text-xs font-medium uppercase tracking-[0.32em] text-family-accent">{tShell('brandTag')}</p>
        <h2 className="font-serif mt-2 text-2xl font-semibold leading-tight">{tShell('brandTitle')}</h2>
        <p className="mt-2 text-sm text-white/75">{tShell('tagline')}</p>
      </Link>

      <nav className="mt-6 space-y-6" aria-label={tShell('mainNav')}>
        <div>
          <NavLink item={PLATFORM_DASHBOARD} pathname={pathname} onNavigate={onNavigate} />
        </div>

        {PLATFORM_NAV_GROUPS.map((group) => (
          <div key={group.groupKey}>
            <p className="mb-2 px-3 text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-stone-400 dark:text-slate-500">
              {tNav(`groups.${group.groupKey}`)}
            </p>
            <div className="space-y-1">
              {group.items.map((item) => (
                <NavLink key={item.href} item={item} pathname={pathname} onNavigate={onNavigate} />
              ))}
            </div>
          </div>
        ))}

        <div className="border-t border-stone-200/80 pt-4 dark:border-slate-800">
          <NavLink item={PLATFORM_SETTINGS} pathname={pathname} onNavigate={onNavigate} />
        </div>
      </nav>
    </>
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
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[17.5rem] border-r border-stone-200/60 bg-white/75 p-4 backdrop-blur-2xl dark:border-slate-800/80 dark:bg-slate-950/75 lg:block">
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
          <aside className="absolute inset-y-0 left-0 w-[min(100%,18rem)] overflow-y-auto border-r bg-white/95 p-4 shadow-2xl dark:bg-slate-950">
            <div className="mb-4 flex justify-end">
              <Button variant="ghost" onClick={() => setMobileOpen(false)} aria-label={tShell('closeMenu')}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            <SidebarContent pathname={pathname} onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      ) : null}

      <div className="lg:pl-[17.5rem]">
        <header className="sticky top-0 z-20 border-b border-stone-200/70 bg-white/75 px-4 py-3 backdrop-blur-2xl dark:border-slate-800/80 dark:bg-slate-950/75 md:px-8">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                className="lg:hidden"
                onClick={() => setMobileOpen(true)}
                aria-label={tShell('openMenu')}
              >
                <Menu className="h-5 w-5" />
              </Button>
              <div>
                <p className="text-[0.65rem] font-semibold uppercase tracking-[0.28em] text-stone-400">{tShell('workspaceLabel')}</p>
                <p className="font-serif mt-0.5 text-base font-semibold text-family-ink dark:text-white">
                  {session?.user.displayName ?? tShell('defaultDisplayName')}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <CommandPalette />
              <LocaleSwitcher />
              <Button variant="secondary" onClick={toggleTheme}>
                {theme === 'dark' ? tShell('lightTheme') : tShell('darkTheme')}
              </Button>
              <Button variant="ghost" onClick={logout}>
                {tShell('logout')}
              </Button>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-[90rem] px-4 py-8 md:px-8">{children}</main>
      </div>
    </div>
  );
}
