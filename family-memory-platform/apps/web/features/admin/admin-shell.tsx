'use client';

import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import { ADMIN_NAV_ITEMS } from './admin-nav';

function isActive(pathname: string, href: string, exact?: boolean) {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminShell({ children, showNav = true }: { children: ReactNode; showNav?: boolean }) {
  const pathname = usePathname();
  const t = useTranslations('adminPanel');

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.28em] text-stone-400 dark:text-slate-500">
          {t('eyebrow')}
        </p>
        <h1 className="font-serif mt-1 text-3xl font-semibold text-family-ink dark:text-white">{t('title')}</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-stone-600 dark:text-slate-300">{t('subtitle')}</p>
      </div>

      {showNav ? (
      <nav
        aria-label={t('navLabel')}
        className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {ADMIN_NAV_ITEMS.map((item) => {
          const active = isActive(pathname, item.href, item.exact);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'inline-flex shrink-0 items-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-medium transition',
                active
                  ? 'border-family-primary bg-family-primary text-white shadow-md shadow-family-primary/20'
                  : 'border-stone-200/80 bg-white/80 text-stone-600 hover:border-family-primary/30 hover:text-family-primary dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-300',
              )}
            >
              <Icon className="h-4 w-4" aria-hidden />
              <span>{t(`nav.${item.key}`)}</span>
              {item.comingSoon ? (
                <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-amber-800 dark:bg-amber-950 dark:text-amber-200">
                  {t('soonBadge')}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>
      ) : null}

      {children}
    </div>
  );
}
