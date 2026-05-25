'use client';

import { personHasKeyEvents } from '@family/tree-experience';
import type { ThreeNodePosition } from '@family/tree-experience';
import type { TreeViewDataResponse, TreeViewNode } from '@family/shared';
import { Image, RoundedBox } from '@react-three/drei';
import { type ThreeEvent } from '@react-three/fiber';
import { Suspense, useMemo, useRef } from 'react';
import type { Mesh } from 'three';

const LIVING_COLOR = '#2dd4bf';
const DECEASED_COLOR = '#64748b';
const HIGHLIGHT_COLOR = '#fbbf24';
const DIM_OPACITY = 0.22;

function PersonAvatar({ url, opacity }: { url: string; opacity: number }) {
  return (
    <Suspense fallback={null}>
      <Image
        url={url}
        position={[0, 0.1, 0.32]}
        scale={[1.05, 1.25]}
        transparent
        opacity={opacity * 0.92}
      />
    </Suspense>
  );
}

export function PersonNode3D({
  layoutNode,
  treeNode,
  data,
  highlighted,
  dimmed,
  focused,
  simplified,
  showLabels,
  onHover,
  onSelect,
}: {
  layoutNode: ThreeNodePosition;
  treeNode: TreeViewNode;
  data: TreeViewDataResponse;
  highlighted: boolean;
  dimmed: boolean;
  focused: boolean;
  simplified: boolean;
  /** Без 3D-текста (troika) — подписи только в hover-карточке */
  showLabels: boolean;
  onHover: (id: string | null) => void;
  onSelect: (node: TreeViewNode) => void;
}) {
  const meshRef = useRef<Mesh>(null);
  const hasEvents = personHasKeyEvents(treeNode.personId, data);

  const baseColor = useMemo(() => {
    if (highlighted || focused) return HIGHLIGHT_COLOR;
    return layoutNode.isLiving ? LIVING_COLOR : DECEASED_COLOR;
  }, [highlighted, focused, layoutNode.isLiving]);

  const opacity = dimmed ? DIM_OPACITY : 1;
  const emissiveIntensity = highlighted || focused ? 0.75 : 0.3;

  return (
    <group
      position={[layoutNode.x, layoutNode.y, layoutNode.z]}
      scale={focused ? 1.08 : 1}
      onPointerOver={(e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation();
        onHover(treeNode.personId);
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={(e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation();
        onHover(null);
        document.body.style.cursor = 'auto';
      }}
      onClick={(e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation();
        onSelect(treeNode);
      }}
    >
      <RoundedBox ref={meshRef} args={[1.35, 1.65, 0.12]} radius={0.06} smoothness={2}>
        <meshStandardMaterial
          color={baseColor}
          emissive={baseColor}
          emissiveIntensity={emissiveIntensity}
          transparent
          opacity={opacity}
          metalness={0.25}
          roughness={0.35}
        />
      </RoundedBox>

      {!simplified && treeNode.avatarUrl ? <PersonAvatar url={treeNode.avatarUrl} opacity={opacity} /> : null}

      {showLabels && (highlighted || focused) ? (
        <mesh position={[0, -0.85, 0.34]}>
          <planeGeometry args={[1.3, 0.28]} />
          <meshBasicMaterial color="#0f172a" transparent opacity={0.85 * opacity} />
        </mesh>
      ) : null}

      {hasEvents ? (
        <mesh position={[0.55, 0.65, 0.35]}>
          <sphereGeometry args={[0.08, 8, 8]} />
          <meshBasicMaterial color="#f472b6" />
        </mesh>
      ) : null}
    </group>
  );
}
