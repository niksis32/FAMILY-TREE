'use client';

import dynamic from 'next/dynamic';
import { useTreeViewData } from './tree-view-data-context';
import { ClassicTreeView } from './classic-tree-view';

const GraphTreeView = dynamic(() => import('./graph-tree-view'), { ssr: false, loading: () => <ViewLoader /> });
const ThreeDTreeView = dynamic(() => import('./three-d-tree-view'), { ssr: false, loading: () => <ViewLoader /> });
const TimelineTreeView = dynamic(() => import('./timeline-tree-view'), { ssr: false, loading: () => <ViewLoader /> });
const MapTreeView = dynamic(() => import('./map-tree-view'), { ssr: false, loading: () => <ViewLoader /> });

function ViewLoader() {
  return <div className="flex h-[min(70vh,720px)] items-center justify-center text-sm text-stone-500">…</div>;
}

export function TreeExperienceActiveView() {
  const { displayMode } = useTreeViewData();

  switch (displayMode) {
    case 'classic':
      return <ClassicTreeView />;
    case 'graph':
      return <GraphTreeView />;
    case 'three-d':
      return <ThreeDTreeView />;
    case 'timeline':
      return <TimelineTreeView />;
    case 'map':
      return <MapTreeView />;
    default:
      return <ClassicTreeView />;
  }
}
