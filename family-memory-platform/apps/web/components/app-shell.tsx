'use client';

import { Link, usePathname } from '@/i18n/navigation';
import { useAuth } from '@/components/auth-provider';
import { LocaleSwitcher } from '@/components/locale-switcher';
import { useTheme } from '@/components/theme-provider';
import { Button } from '@/components/ui';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: '◌' },
  { href: '/persons', label: 'Люди', icon: '◎' },
  { href: '/families', label: 'Семьи', icon: '⌘' },
  { href: '/tree', label: 'Древо', icon: '⌁' },
  { href: '/timeline', label: 'Хронология', icon: '↦' },
  { href: '/media', label: 'Медиа', icon: '▣' },
  { href: '/documents', label: 'Документы', icon: '◇' },
  { href: '/search', label: 'Поиск', icon: '⌕' },
  { href: '/settings', label: 'Настройки', icon: '⚙' },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { session, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(201,162,39,0.18),transparent_32%),linear-gradient(135deg,#fbfaf8,#eef2f7)] dark:bg-[radial-gradient(circle_at_top_left,rgba(201,162,39,0.18),transparent_30%),linear-gradient(135deg,#020617,#111827)]">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 border-r bg-white/80 p-5 backdrop-blur-xl dark:bg-slate-950/70 lg:block">
        <Link href="/dashboard" className="block rounded-3xl bg-family-primary p-5 text-white shadow-premium dark:bg-slate-900">
          <p className="text-xs uppercase tracking-[0.35em] text-family-accent">AI Genealogy</p>
          <h2 className="mt-3 text-2xl font-semibold">Family Memory</h2>
          <p className="mt-2 text-sm text-white/70">Self-hosted семейная платформа</p>
        </Link>

        <nav className="mt-8 space-y-2">
          {navItems.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium text-stone-600 transition hover:bg-stone-100 hover:text-family-primary dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-white',
                  active && 'bg-family-primary text-white shadow-lg shadow-family-primary/15 hover:bg-family-primary hover:text-white dark:bg-family-accent dark:text-slate-950',
                )}
              >
                <span className="w-5 text-center">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="lg:pl-72">
        <header className="sticky top-0 z-20 border-b bg-white/70 px-4 py-4 backdrop-blur-xl dark:bg-slate-950/70 md:px-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-stone-400">MVP Workspace</p>
              <p className="mt-1 font-semibold text-family-ink dark:text-white">
                {session?.user.displayName ?? 'Family Admin'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <LocaleSwitcher />
              <Button variant="secondary" onClick={toggleTheme}>
                {theme === 'dark' ? 'Светлая' : 'Тёмная'} тема
              </Button>
              <Button variant="ghost" onClick={logout}>
                Выйти
              </Button>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-4 py-8 md:px-8">{children}</main>
      </div>
    </div>
  );
}
