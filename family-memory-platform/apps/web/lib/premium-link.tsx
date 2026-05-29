'use client';

import { Link } from '@/i18n/navigation';
import type { QuickActionLinkProps } from '@family/ui';

/** Locale-aware Link adapter for @family/ui QuickActionCard */
export function PremiumLink({ href, className, children }: QuickActionLinkProps) {
  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}
