import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Family Memory Platform',
  description: 'Self-hosted family tree, media archive, and timeline',
};

/** Locale segment supplies `<html lang>` — see `app/[locale]/layout.tsx`. */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
