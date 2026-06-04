'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import { buildCameraTour } from './build-camera-tour';
import { ThreeDTreeScene } from './three-d-tree-scene';
import { Tree3dToolbar } from './tree-3d-toolbar';
import { TreeLegend } from './tree-legend';
import { useTree3dStore } from './use-tree-3d-store';
import { useWebglCapability } from './use-webgl-capability';
import { useTreeViewData } from '../tree-view-data-context';
import { buildThreeLayout } from '@family/tree-experience';
import { CoverImage } from '@family/ui';
import { PARCHMENT_TEXTURE_SRC } from './tree-parchment-environment';

const GraphTreeView = dynamic(() => import('../graph-tree-view'), { ssr: false });

export default function ThreeDTreeView() {
  const { data, setSelectedNode } = useTreeViewData();
  const t = useTranslations('treeExperience');
  const t3d = useTranslations('treeExperience.threeD');
  const capability = useWebglCapability();
  const [webglFailed, setWebglFailed] = useState(false);

  const highlightMode = useTree3dStore((s) => s.highlightMode);
  const setCameraWaypoints = useTree3dStore((s) => s.setCameraWaypoints);
  const resetInteractionState = useTree3dStore((s) => s.resetInteractionState);
  const setCinematicActive = useTree3dStore((s) => s.setCinematicActive);

  const layout = useMemo(() => (data ? buildThreeLayout(data) : null), [data]);

  const handleContextLost = useCallback(() => {
    setWebglFailed(true);
    setCinematicActive(false);
  }, [setCinematicActive]);

  useEffect(() => {
    setWebglFailed(false);
  }, [data?.meta.rootPersonId, data?.meta.generatedAt]);

  useEffect(() => {
    if (!layout || !data) return;
    setCameraWaypoints(buildCameraTour(layout, data.meta.rootPersonId));
  }, [layout, data, setCameraWaypoints]);

  useEffect(() => {
    if (capability.tier !== 'high') {
      setCinematicActive(false);
    }
  }, [capability.tier, setCinematicActive]);

  useEffect(() => {
    return () => resetInteractionState();
  }, [resetInteractionState]);

  if (!data || !layout || layout.nodes.length === 0) {
    return <p className="p-8 text-center text-sm text-stone-500">{t('empty')}</p>;
  }

  if (!capability.supported || webglFailed) {
    return (
      <div className="space-y-3">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="rounded-2xl border border-amber-500/40 bg-amber-950/30 px-4 py-3 text-sm text-amber-100"
        >
          {webglFailed ? t3d('fallback.contextLost') : t3d('fallback.message')}
        </motion.div>
        <GraphTreeView />
      </div>
    );
  }

  return (
    <CoverImage
      src={PARCHMENT_TEXTURE_SRC}
      className="relative h-[min(70vh,720px)] w-full overflow-hidden rounded-3xl border border-amber-900/30 bg-[#2a1f14] shadow-inner shadow-amber-950/30"
    >
      <ThreeDTreeScene
        data={data}
        capability={capability}
        onSelectNode={setSelectedNode}
        onContextLost={handleContextLost}
      />
      <Tree3dToolbar data={data} />
      <TreeLegend highlightMode={highlightMode} />
      {capability.tier !== 'high' ? (
        <p className="pointer-events-none absolute bottom-4 right-4 z-10 text-[10px] text-amber-200/70">
          {t3d('performance.simplified')}
        </p>
      ) : null}
    </CoverImage>
  );
}
