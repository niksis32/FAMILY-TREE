'use client';

import { useState } from 'react';
import { GitBranch, LogOut, Menu, Moon, Sun, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/navigation';
import { useAuth } from '@/components/auth-provider';
import { LocaleSwitcher } from '@/components/locale-switcher';
import { NotificationBell } from '@/features/notifications/notification-bell';
import { useTheme } from '@/components/theme-provider';
import { Button } from '@/components/ui';
import { ADMIN_NAV_ITEMS } from '@/features/admin/admin-nav';
import { AdminModerationPendingBadge } from '@/features/admin/admin-moderation-pending-badge';
import { AdminModerationQueuesProvider, useAdminModerationQueues } from '@/features/admin/use-admin-moderation-queues';
import { cn } from '@/lib/utils';

function isAdminNavActive(pathname: string, href: string, exact?: boolean) {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminAppShell({ children }: { children: React.ReactNode }) {
  return (
    <AdminModerationQueuesProvider>
      <AdminAppShellInner>{children}</AdminAppShellInner>
    </AdminModerationQueuesProvider>
  );
}

function AdminAppShellInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { session, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { hasPending } = useAdminModerationQueues();
  const t = useTranslations('adminPanel');
  const tShell = useTranslations('adminShell');
  const [mobileOpen, setMobileOpen] = useState(false);

  const sidebar = (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 rounded-[1.35rem] border border-indigo-400/30 bg-gradient-to-br from-indigo-950 via-violet-950 to-slate-950 p-5 text-white shadow-lg shadow-indigo-950/40">
        <p className="text-xs font-semibold uppercase tracking-[0.32em] text-indigo-300">{tShell('brandTag')}</p>
        <h2 className="font-serif mt-2 text-2xl font-semibold leading-tight">{tShell('brandTitle')}</h2>
        <p className="mt-2 text-sm text-indigo-100/80">{tShell('tagline')}</p>
      </div>

      <nav className="mt-6 min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-contain pr-1" aria-label={t('navLabel')}>
        {ADMIN_NAV_ITEMS.map((item) => {
          const active = isAdminNavActive(pathname, item.href, item.exact);
          const Icon = item.icon;
          const showBadge = item.key === 'moderation' && hasPending;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                'flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-sm font-medium transition duration-200',
                active
                  ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/30'
                  : 'text-indigo-100/85 hover:bg-indigo-500/15 hover:text-white',
                showBadge && !active && 'ring-1 ring-amber-400/50',
              )}
            >
              <Icon className="h-[1.125rem] w-[1.125rem] shrink-0" aria-hidden />
              <span className="truncate flex-1">{t(`nav.${item.key}`)}</span>
              {showBadge ? <AdminModerationPendingBadge /> : null}
            </Link>
          );
        })}
      </nav>

      <div className="mt-4 shrink-0 space-y-2 border-t border-indigo-500/25 pt-4">
        <Link
          href="/dashboard"
          onClick={() => setMobileOpen(false)}
          className="flex items-center gap-3 rounded-2xl border border-amber-400/40 bg-gradient-to-r from-amber-500/20 to-orange-500/10 px-3.5 py-3 text-sm font-semibold text-amber-100 transition hover:from-amber-500/30 hover:to-orange-500/20"
        >
          <GitBranch className="h-[1.125rem] w-[1.125rem] shrink-0 text-amber-300" aria-hidden />
          <span>{tShell('personalArchive')}</span>
        </Link>
        <p className="px-1 text-[11px] leading-4 text-indigo-200/60">{tShell('personalArchiveHint')}</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top_left,rgba(99,102,241,0.22),transparent_42%),linear-gradient(165deg,#0f172a_0%,#1e1b4b_38%,#0f172a_100%)]">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[17.5rem] flex-col border-r border-indigo-500/20 bg-slate-950/95 p-4 backdrop-blur-2xl lg:flex">
        {sidebar}
      </aside>

      {mobileOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            aria-label={tShell('closeMenu')}
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 flex w-[min(100%,18rem)] flex-col overflow-hidden border-r border-indigo-500/30 bg-slate-950 p-4 shadow-2xl">
            <div className="mb-4 flex shrink-0 justify-end">
              <Button variant="ghost" className="text-indigo-100" onClick={() => setMobileOpen(false)} aria-label={tShell('closeMenu')}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="min-h-0 flex-1">{sidebar}</div>
          </aside>
        </div>
      ) : null}

      <div className="min-w-0 lg:pl-[17.5rem]">
        <header className="sticky top-0 z-20 border-b border-indigo-500/20 bg-slate-950/80 px-3 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur-2xl sm:px-4 md:px-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-2 sm:gap-3">
              <Button
                variant="ghost"
                className="shrink-0 px-2.5 text-indigo-100 lg:hidden"
                onClick={() => setMobileOpen(true)}
                aria-label={tShell('openMenu')}
              >
                <Menu className="h-5 w-5" />
              </Button>
              <div className="min-w-0">
                <p className="text-[0.65rem] font-semibold uppercase tracking-[0.28em] text-indigo-300/80">{tShell('signedInAs')}</p>
                <p className="font-serif mt-0.5 truncate text-base font-semibold text-white">
                  {session?.user.displayName ?? tShell('defaultAdmin')}
                </p>
              </div>
            </div>
            <div className="flex min-w-0 flex-wrap items-center justify-end gap-2">
              <NotificationBell />
              <LocaleSwitcher />
              <Button
                variant="secondary"
                className="shrink-0 border-indigo-500/30 bg-indigo-950/60 px-3 text-indigo-100"
                onClick={toggleTheme}
                aria-label={theme === 'dark' ? tShell('lightTheme') : tShell('darkTheme')}
              >
                {theme === 'dark' ? <Sun className="h-4 w-4 sm:mr-2" /> : <Moon className="h-4 w-4 sm:mr-2" />}
                <span className="hidden sm:inline">{theme === 'dark' ? tShell('lightTheme') : tShell('darkTheme')}</span>
              </Button>
              <Button variant="ghost" className="shrink-0 px-3 text-indigo-100" onClick={logout} aria-label={tShell('logout')}>
                <LogOut className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">{tShell('logout')}</span>
              </Button>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-[90rem] px-3 py-6 sm:px-4 sm:py-8 md:px-8">{children}</main>
      </div>
    </div>
  );
}
