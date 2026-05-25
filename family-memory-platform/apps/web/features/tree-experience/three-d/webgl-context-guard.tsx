'use client';

import { useThree } from '@react-three/fiber';
import { useEffect } from 'react';

export function WebglContextGuard({ onContextLost }: { onContextLost: () => void }) {
  const gl = useThree((s) => s.gl);

  useEffect(() => {
    const canvas = gl.domElement;

    const onLost = (event: Event) => {
      event.preventDefault();
      onContextLost();
    };

    canvas.addEventListener('webglcontextlost', onLost, false);
    return () => canvas.removeEventListener('webglcontextlost', onLost);
  }, [gl, onContextLost]);

  return null;
}
