import type { ReactNode } from 'react';
import { cn } from '../lib/cn';

export function CoverImage({
  src,
  alt = '',
  className,
  children,
}: {
  src: string;
  alt?: string;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div
      role={alt && !children ? 'img' : undefined}
      aria-label={alt && !children ? alt : undefined}
      className={cn('bg-cover bg-center', className)}
      style={{ backgroundImage: `url(${src})` }}
    >
      {children}
    </div>
  );
}
