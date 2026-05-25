'use client';

import { useEffect, useState } from 'react';

export interface WebglCapability {
  supported: boolean;
  tier: 'high' | 'medium' | 'low';
  reason?: string;
}

function detectWebgl(): boolean {
  if (typeof document === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    const gl =
      canvas.getContext('webgl2') ??
      canvas.getContext('webgl') ??
      canvas.getContext('experimental-webgl');
    return Boolean(gl);
  } catch {
    return false;
  }
}

function detectTier(): 'high' | 'medium' | 'low' {
  if (typeof navigator === 'undefined') return 'medium';
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  const cores = navigator.hardwareConcurrency ?? 4;
  if (memory != null && memory <= 2) return 'low';
  if (cores <= 2) return 'low';
  if (memory != null && memory <= 4) return 'medium';
  return 'high';
}

export function useWebglCapability(): WebglCapability {
  const [capability, setCapability] = useState<WebglCapability>({
    supported: true,
    tier: 'medium',
  });

  useEffect(() => {
    const supported = detectWebgl();
    const tier = detectTier();
    setCapability({
      supported,
      tier,
      reason: supported ? undefined : 'WebGL unavailable',
    });
  }, []);

  return capability;
}

export function shouldUseSimplifiedMeshes(tier: WebglCapability['tier'], nodeCount: number): boolean {
  if (tier === 'low') return true;
  if (tier === 'medium') return true;
  if (nodeCount > 80) return true;
  return false;
}

/** Облегчённая сцена: одна плоскость фона, без цилиндра и 3D-текста */
export function shouldUseLiteScene(tier: WebglCapability['tier'], nodeCount: number): boolean {
  if (tier !== 'high') return true;
  if (nodeCount > 40) return true;
  return false;
}
