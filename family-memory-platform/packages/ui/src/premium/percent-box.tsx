import type { ComponentPropsWithoutRef, ElementType, ReactNode } from 'react';
import { cn } from '../lib/cn';

type PercentBoxProps<T extends ElementType = 'div'> = {
  as?: T;
  x: number;
  y: number;
  width: number;
  height: number;
  className?: string;
  children?: ReactNode;
} & Omit<ComponentPropsWithoutRef<T>, 'as' | 'style'>;

export function PercentBox<T extends ElementType = 'div'>({
  as,
  x,
  y,
  width,
  height,
  className,
  children,
  ...props
}: PercentBoxProps<T>) {
  const Component = as ?? 'div';

  return (
    <Component
      className={cn('absolute', className)}
      style={{
        left: `${x * 100}%`,
        top: `${y * 100}%`,
        width: `${width * 100}%`,
        height: `${height * 100}%`,
      }}
      {...props}
    >
      {children}
    </Component>
  );
}
