'use client';

import type { ReactNode } from 'react';

type BrandingShellProps = {
  branding: {
    displayName?: string | null;
    primaryColor?: string | null;
    secondaryColor?: string | null;
    logoUrl?: string | null;
  } | null;
  children: ReactNode;
};

export function BrandingShell({ branding, children }: BrandingShellProps) {
  const style = branding
    ? ({
        '--brand-primary': branding.primaryColor ?? '#1e3a5f',
        '--brand-secondary': branding.secondaryColor ?? '#c4a35a',
      } as React.CSSProperties)
    : undefined;

  return (
    <div data-branding={branding?.displayName ?? 'default'} style={style}>
      {children}
    </div>
  );
}
