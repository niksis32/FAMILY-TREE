import type { Metadata, Viewport } from 'next';
import { AppProviders } from '@/components/app-providers';
import './globals.css';

export const viewport: Viewport = {
  themeColor: '#2d5a27',
};

export const metadata: Metadata = {
  title: 'Family Memory Platform',
  description: 'Self-hosted family tree, media archive, and timeline',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, title: 'Family Memory' },
};

/** Auth/theme live here so locale switches do not remount the session. */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html suppressHydrationWarning>
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
