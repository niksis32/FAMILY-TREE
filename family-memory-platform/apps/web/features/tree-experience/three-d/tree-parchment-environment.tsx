'use client';

import { Component, type ReactNode, Suspense, useMemo } from 'react';
import * as THREE from 'three';
import type { ThreeLayoutResult } from '@family/tree-experience';
import parchmentImage from './assets/parchment-genealogy-bg.png';
import { useOptimizedTexture } from './use-optimized-texture';
import type { WebglCapability } from './use-webgl-capability';

export const PARCHMENT_TEXTURE_SRC =
  typeof parchmentImage === 'object' && parchmentImage !== null && 'src' in parchmentImage
    ? parchmentImage.src
    : String(parchmentImage);

function ParchmentBackdrop({ layout, lite }: { layout: ThreeLayoutResult; lite: boolean }) {
  const texture = useOptimizedTexture(PARCHMENT_TEXTURE_SRC, lite ? 512 : 1024);

  const cx = (layout.bounds.minX + layout.bounds.maxX) / 2;
  const cy = (layout.bounds.minY + layout.bounds.maxY) / 2;
  const cz = (layout.bounds.minZ + layout.bounds.maxZ) / 2;
  const spanX = Math.max(layout.bounds.maxX - layout.bounds.minX, 10);
  const spanY = Math.max(layout.bounds.maxY - layout.bounds.minY, 6);
  const planeW = Math.max(spanX, spanY) * 2.8 + 20;
  const planeH = planeW * 0.65;

  const material = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        map: texture,
        side: THREE.BackSide,
        toneMapped: false,
        transparent: true,
        opacity: lite ? 0.75 : 0.88,
        depthWrite: false,
      }),
    [texture, lite],
  );

  return (
    <group position={[cx, cy - 0.5, cz - 8]}>
      <mesh material={material}>
        <planeGeometry args={[planeW, planeH]} />
      </mesh>
      <mesh position={[0, 0, 1.5]}>
        <planeGeometry args={[planeW * 1.05, planeH * 1.05]} />
        <meshBasicMaterial color="#1a1208" transparent opacity={0.28} depthWrite={false} />
      </mesh>
    </group>
  );
}

function ParchmentFallback({ layout }: { layout: ThreeLayoutResult }) {
  const cx = (layout.bounds.minX + layout.bounds.maxX) / 2;
  const cy = (layout.bounds.minY + layout.bounds.maxY) / 2;
  const cz = (layout.bounds.minZ + layout.bounds.maxZ) / 2;
  const planeW = 40;

  return (
    <group position={[cx, cy - 0.5, cz - 8]}>
      <mesh>
        <planeGeometry args={[planeW, planeW * 0.65]} />
        <meshBasicMaterial color="#c9a66b" side={THREE.BackSide} />
      </mesh>
    </group>
  );
}

class ParchmentTextureBoundary extends Component<
  { layout: ThreeLayoutResult; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }

  render() {
    if (this.state.failed) {
      return <ParchmentFallback layout={this.props.layout} />;
    }
    return this.props.children;
  }
}

export function TreeParchmentEnvironment({
  layout,
  capability,
}: {
  layout: ThreeLayoutResult;
  capability: WebglCapability;
}) {
  const lite = capability.tier !== 'high';

  return (
    <ParchmentTextureBoundary layout={layout}>
      <Suspense fallback={<ParchmentFallback layout={layout} />}>
        <ParchmentBackdrop layout={layout} lite={lite} />
      </Suspense>
    </ParchmentTextureBoundary>
  );
}
