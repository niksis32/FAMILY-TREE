'use client';

import { CameraControls as DreiCameraControls } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { type ElementRef, useEffect, useRef } from 'react';
import { useTree3dStore } from './use-tree-3d-store';

type CameraControlsRef = ElementRef<typeof DreiCameraControls>;

const TOUR_SEGMENT_MS = 5200;

export function TreeCameraControls({
  defaultPosition,
  defaultTarget,
  focusPosition,
}: {
  defaultPosition: [number, number, number];
  defaultTarget: [number, number, number];
  focusPosition: [number, number, number] | null;
}) {
  const controlsRef = useRef<CameraControlsRef>(null);
  const segmentStart = useRef(Date.now());
  const lastFocusRef = useRef<string | null>(null);

  const cinematicActive = useTree3dStore((s) => s.cinematicActive);
  const cinematicPaused = useTree3dStore((s) => s.cinematicPaused);
  const tourIndex = useTree3dStore((s) => s.tourIndex);
  const waypoints = useTree3dStore((s) => s.cameraWaypoints);
  const setTourIndex = useTree3dStore((s) => s.setTourIndex);
  const setCinematicPaused = useTree3dStore((s) => s.setCinematicPaused);
  const resetToken = useTree3dStore((s) => s.resetCameraToken);
  const focusedPersonId = useTree3dStore((s) => s.focusedPersonId);

  useEffect(() => {
    const ctrl = controlsRef.current;
    if (!ctrl) return;
    void ctrl.setLookAt(
      defaultPosition[0],
      defaultPosition[1],
      defaultPosition[2],
      defaultTarget[0],
      defaultTarget[1],
      defaultTarget[2],
      true,
    );
    lastFocusRef.current = null;
  }, [resetToken, defaultPosition, defaultTarget]);

  useEffect(() => {
    if (!focusPosition || cinematicActive) return;
    const key = `${focusedPersonId}-${focusPosition.join(',')}`;
    if (lastFocusRef.current === key) return;
    lastFocusRef.current = key;
    const ctrl = controlsRef.current;
    if (!ctrl) return;
    void ctrl.setLookAt(
      focusPosition[0] + 2.8,
      focusPosition[1] + 2.2,
      focusPosition[2] + 6.5,
      focusPosition[0],
      focusPosition[1],
      focusPosition[2],
      true,
    );
    segmentStart.current = Date.now();
  }, [focusPosition, focusedPersonId, cinematicActive]);

  useEffect(() => {
    if (!cinematicActive || waypoints.length === 0) return;
    const ctrl = controlsRef.current;
    if (!ctrl) return;
    const wp = waypoints[0];
    void ctrl.setLookAt(
      wp.position[0],
      wp.position[1],
      wp.position[2],
      wp.target[0],
      wp.target[1],
      wp.target[2],
      true,
    );
    segmentStart.current = Date.now();
  }, [cinematicActive, waypoints]);

  useFrame((_, delta) => {
    const ctrl = controlsRef.current;
    if (!ctrl) return;
    if (cinematicActive && !cinematicPaused && waypoints.length > 0) {
      const now = Date.now();
      if (now - segmentStart.current > TOUR_SEGMENT_MS) {
        const next = (tourIndex + 1) % waypoints.length;
        setTourIndex(next);
        segmentStart.current = now;
        const wp = waypoints[next];
        void ctrl.setLookAt(
          wp.position[0],
          wp.position[1],
          wp.position[2],
          wp.target[0],
          wp.target[1],
          wp.target[2],
          true,
        );
      }
    }
    void ctrl.update(delta);
  });

  return (
    <DreiCameraControls
      ref={controlsRef}
      makeDefault
      minDistance={3}
      maxDistance={80}
      onStart={() => {
        if (cinematicActive) setCinematicPaused(true);
      }}
      onEnd={() => {
        segmentStart.current = Date.now();
      }}
    />
  );
}
