import type { ReactNode } from 'react';

/** Skeleton UI card — replace with real components per feature iteration */
export function PlaceholderCard({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
      <h3 className="text-lg font-semibold text-stone-800">{title}</h3>
      {children ? <p className="mt-2 text-stone-600">{children}</p> : null}
    </div>
  );
}
