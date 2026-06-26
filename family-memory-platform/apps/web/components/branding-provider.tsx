import { headers } from 'next/headers';
import type { ReactNode } from 'react';
import { BrandingShell } from './branding-shell';

type ResolvedBranding = {
  displayName?: string | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
  logoUrl?: string | null;
};

async function resolveBranding(): Promise<ResolvedBranding | null> {
  const host = (await headers()).get('host');
  if (!host || host.startsWith('localhost')) return null;

  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';
  try {
    const res = await fetch(`${apiBase}/branding/resolve?host=${encodeURIComponent(host)}`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    return (await res.json()) as ResolvedBranding;
  } catch {
    return null;
  }
}

export async function BrandingProvider({ children }: { children: ReactNode }) {
  const branding = await resolveBranding();
  return <BrandingShell branding={branding}>{children}</BrandingShell>;
}
