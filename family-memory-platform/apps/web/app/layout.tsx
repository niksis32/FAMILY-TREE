import type { Metadata } from 'next';
import { AppProviders } from '@/components/app-providers';
import './globals.css';

export const metadata: Metadata = {
  title: 'Family Memory Platform',
  description: 'Self-hosted family tree, media archive, and timeline',
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
