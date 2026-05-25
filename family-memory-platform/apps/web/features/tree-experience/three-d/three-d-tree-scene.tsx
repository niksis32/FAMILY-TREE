'use client';

import { buildThreeLayout, resolveHighlightSet } from '@family/tree-experience';
import type { TreeViewDataResponse, TreeViewNode } from '@family/shared';
import { Canvas } from '@react-three/fiber';
import { useCallback, useMemo } from 'react';
import { PersonHoverCard } from './person-hover-card';
import { TreeParchmentEnvironment } from './tree-parchment-environment';
import { PersonNode3D } from './person-node-3d';
import { RelationshipLine3D } from './relationship-line-3d';
import { TreeCameraControls } from './tree-camera-controls';
import { useTree3dStore } from './use-tree-3d-store';
import { shouldUseLiteScene, shouldUseSimplifiedMeshes, type WebglCapability } from './use-webgl-capability';
import { WebglContextGuard } from './webgl-context-guard';

function SceneContent({
  data,
  simplified,
  liteScene,
  onSelectNode,
  onContextLost,
}: {
  data: TreeViewDataResponse;
  simplified: boolean;
  liteScene: boolean;
  onSelectNode: (node: TreeViewNode) => void;
  onContextLost: () => void;
}) {
  const layout = useMemo(() => buildThreeLayout(data), [data]);
  const nodeById = useMemo(() => new Map(data.nodes.map((n) => [n.personId, n])), [data]);
  const posById = useMemo(() => new Map(layout.nodes.map((n) => [n.personId, n])), [layout.nodes]);

  const highlightMode = useTree3dStore((s) => s.highlightMode);
  const focusedPersonId = useTree3dStore((s) => s.focusedPersonId);
  const hoveredPersonId = useTree3dStore((s) => s.hoveredPersonId);
  const generationMin = useTree3dStore((s) => s.generationMin);
  const generationMax = useTree3dStore((s) => s.generationMax);
  const setHoveredPersonId = useTree3dStore((s) => s.setHoveredPersonId);
  const setFocusedPersonId = useTree3dStore((s) => s.setFocusedPersonId);
  const capability = useMemo(
    (): WebglCapability => ({ supported: true, tier: liteScene ? 'medium' : 'high' }),
    [liteScene],
  );

  const anchorId = focusedPersonId ?? data.meta.rootPersonId;
  const highlightSet = useMemo(
    () => resolveHighlightSet(highlightMode, anchorId, data),
    [highlightMode, anchorId, data],
  );

  const hasHighlight = highlightMode !== 'none' && highlightSet.size > 0;

  const defaultPosition: [number, number, number] = useMemo(() => {
    const cx = (layout.bounds.minX + layout.bounds.maxX) / 2;
    const cy = (layout.bounds.minY + layout.bounds.maxY) / 2;
    const cz = (layout.bounds.minZ + layout.bounds.maxZ) / 2;
    const spanX = layout.bounds.maxX - layout.bounds.minX;
    return [cx, cy + 8, cz + Math.max(spanX, 8) + 12];
  }, [layout.bounds]);

  const defaultTarget: [number, number, number] = useMemo(() => {
    const cx = (layout.bounds.minX + layout.bounds.maxX) / 2;
    const cy = (layout.bounds.minY + layout.bounds.maxY) / 2;
    const cz = (layout.bounds.minZ + layout.bounds.maxZ) / 2;
    return [cx, cy, cz];
  }, [layout.bounds]);

  const hoveredNode = hoveredPersonId ? nodeById.get(hoveredPersonId) : null;
  const hoveredPos = hoveredPersonId ? posById.get(hoveredPersonId) : null;

  const focusLayout = focusedPersonId ? posById.get(focusedPersonId) : null;
  const focusPosition: [number, number, number] | null = focusLayout
    ? [focusLayout.x, focusLayout.y, focusLayout.z]
    : null;

  const isGenerationVisible = (gen: number) => {
    if (generationMin != null && gen < generationMin) return false;
    if (generationMax != null && gen > generationMax) return false;
    return true;
  };

  const handleContextLost = useCallback(() => {
    onContextLost();
  }, [onContextLost]);

  return (
    <>
      <WebglContextGuard onContextLost={handleContextLost} />
      <color attach="background" args={['#2a1f14']} />
      <fog attach="fog" args={['#3d2e1f', 40, 100]} />
      <ambientLight intensity={0.5} color="#f5e6c8" />
      <directionalLight position={[5, 12, 8]} intensity={0.7} color="#fff8eb" />

      <TreeParchmentEnvironment layout={layout} capability={capability} />

      {layout.edges.map((edge) => {
        const edgeHighlighted =
          hasHighlight &&
          (highlightSet.has(edge.sourceId) || highlightSet.has(edge.targetId));
        const edgeDimmed = hasHighlight && !edgeHighlighted;
        return (
          <RelationshipLine3D
            key={edge.id}
            edge={edge}
            highlighted={edgeHighlighted}
            dimmed={
              edgeDimmed ||
              !isGenerationVisible(nodeById.get(edge.sourceId)?.generation ?? 0)
            }
          />
        );
      })}

      {layout.nodes.map((layoutNode) => {
        const treeNode = nodeById.get(layoutNode.personId);
        if (!treeNode) return null;

        const genVisible = isGenerationVisible(layoutNode.generation);
        const nodeHighlighted = hasHighlight && highlightSet.has(layoutNode.personId);
        const nodeDimmed = (hasHighlight && !nodeHighlighted) || !genVisible;
        const nodeFocused = focusedPersonId === layoutNode.personId;

        return (
          <PersonNode3D
            key={layoutNode.personId}
            layoutNode={layoutNode}
            treeNode={treeNode}
            data={data}
            highlighted={nodeHighlighted || nodeFocused}
            dimmed={nodeDimmed}
            focused={nodeFocused}
            simplified={simplified}
            showLabels={false}
            onHover={setHoveredPersonId}
            onSelect={(node) => {
              setFocusedPersonId(node.personId);
              onSelectNode(node);
            }}
          />
        );
      })}

      {hoveredNode && hoveredPos ? (
        <PersonHoverCard
          node={hoveredNode}
          data={data}
          position={[hoveredPos.x, hoveredPos.y, hoveredPos.z]}
        />
      ) : null}

      <TreeCameraControls
        defaultPosition={defaultPosition}
        defaultTarget={defaultTarget}
        focusPosition={focusPosition}
      />
    </>
  );
}

export function ThreeDTreeScene({
  data,
  capability,
  onSelectNode,
  onContextLost,
}: {
  data: TreeViewDataResponse;
  capability: WebglCapability;
  onSelectNode: (node: TreeViewNode) => void;
  onContextLost: () => void;
}) {
  const simplified = shouldUseSimplifiedMeshes(capability.tier, data.nodes.length);
  const liteScene = shouldUseLiteScene(capability.tier, data.nodes.length);
  const dpr: [number, number] = capability.tier === 'high' ? [1, 1.5] : [1, 1.25];

  return (
    <Canvas
      camera={{ position: [8, 10, 16], fov: 42, near: 0.1, far: 120 }}
      dpr={dpr}
      gl={{
        antialias: false,
        alpha: false,
        powerPreference: 'default',
        stencil: false,
        depth: true,
      }}
      className="!h-full !w-full"
    >
      <SceneContent
        data={data}
        simplified={simplified}
        liteScene={liteScene}
        onSelectNode={onSelectNode}
        onContextLost={onContextLost}
      />
    </Canvas>
  );
}
