import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Family Memory Platform',
  description: 'Self-hosted family tree, media archive, and timeline',
};

/**
 * Root layout — global shell for all routes.
 * Iteration: auth provider, sidebar navigation, theme.
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body>
        <header className="border-b border-stone-200 bg-white px-6 py-4 shadow-sm">
          <div className="mx-auto flex max-w-7xl items-center justify-between">
            <h1 className="text-xl font-semibold text-family-primary">Family Memory</h1>
            <nav className="flex gap-4 text-sm text-stone-600">
              <a href="/">Главная</a>
              <a href="/persons">Люди</a>
              <a href="/tree">Древо</a>
              <a href="/search">Поиск</a>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
      </body>
    </html>
  );
}
