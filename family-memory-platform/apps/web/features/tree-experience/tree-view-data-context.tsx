'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import type { TreeViewDataQuery, TreeViewDataResponse, TreeViewNode } from '@family/shared';

export type TreeDisplayMode = 'classic' | 'graph' | 'three-d' | 'timeline' | 'map';

interface TreeViewDataContextValue {
  data: TreeViewDataResponse | null;
  loading: boolean;
  error: string | null;
  displayMode: TreeDisplayMode;
  setDisplayMode: (mode: TreeDisplayMode) => void;
  selectedNode: TreeViewNode | null;
  setSelectedNode: (node: TreeViewNode | null) => void;
  filters: TreeViewDataQuery;
  setFilters: (next: TreeViewDataQuery) => void;
  refetch: () => void;
}

const TreeViewDataContext = createContext<TreeViewDataContextValue | null>(null);

export function TreeViewDataProvider({
  children,
  value,
}: {
  children: ReactNode;
  value: TreeViewDataContextValue;
}) {
  const memo = useMemo(() => value, [value]);
  return <TreeViewDataContext.Provider value={memo}>{children}</TreeViewDataContext.Provider>;
}

export function useTreeViewData() {
  const ctx = useContext(TreeViewDataContext);
  if (!ctx) {
    throw new Error('useTreeViewData must be used within TreeViewDataProvider');
  }
  return ctx;
}
