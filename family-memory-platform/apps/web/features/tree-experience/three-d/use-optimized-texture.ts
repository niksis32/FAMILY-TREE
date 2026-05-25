'use client';

import { useTexture } from '@react-three/drei';
import { useEffect } from 'react';
import * as THREE from 'three';

const MAX_TEXTURE_PX = 1024;

function downscaleTexture(texture: THREE.Texture, maxPx: number) {
  const image = texture.image as HTMLImageElement | HTMLCanvasElement | undefined;
  if (!image || !('width' in image)) return;

  const w = image.width;
  const h = image.height;
  if (w <= maxPx && h <= maxPx) return;

  const scale = maxPx / Math.max(w, h);
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.floor(w * scale));
  canvas.height = Math.max(1, Math.floor(h * scale));
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.drawImage(image as CanvasImageSource, 0, 0, canvas.width, canvas.height);
  texture.image = canvas;
  texture.needsUpdate = true;
}

export function useOptimizedTexture(src: string, maxPx = MAX_TEXTURE_PX) {
  const texture = useTexture(src);

  useEffect(() => {
    downscaleTexture(texture, maxPx);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = false;
    texture.anisotropy = 1;
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping;
  }, [texture, maxPx]);

  return texture;
}
