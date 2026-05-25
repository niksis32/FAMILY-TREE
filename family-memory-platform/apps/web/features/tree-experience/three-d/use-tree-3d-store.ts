'use client';

import { create } from 'zustand';
import type { ThreeHighlightMode } from '@family/tree-experience';

export interface CameraWaypoint {
  position: [number, number, number];
  target: [number, number, number];
  label?: string;
}

interface Tree3dState {
  focusedPersonId: string | null;
  hoveredPersonId: string | null;
  highlightMode: ThreeHighlightMode;
  generationMin: number | null;
  generationMax: number | null;
  searchQuery: string;
  cinematicActive: boolean;
  cinematicPaused: boolean;
  tourIndex: number;
  cameraWaypoints: CameraWaypoint[];
  resetCameraToken: number;
  setFocusedPersonId: (id: string | null) => void;
  setHoveredPersonId: (id: string | null) => void;
  setHighlightMode: (mode: ThreeHighlightMode) => void;
  setGenerationRange: (min: number | null, max: number | null) => void;
  setSearchQuery: (q: string) => void;
  setCinematicActive: (active: boolean) => void;
  setCinematicPaused: (paused: boolean) => void;
  setTourIndex: (index: number) => void;
  setCameraWaypoints: (waypoints: CameraWaypoint[]) => void;
  requestCameraReset: () => void;
  resetInteractionState: () => void;
}

export const useTree3dStore = create<Tree3dState>((set) => ({
  focusedPersonId: null,
  hoveredPersonId: null,
  highlightMode: 'none',
  generationMin: null,
  generationMax: null,
  searchQuery: '',
  cinematicActive: false,
  cinematicPaused: false,
  tourIndex: 0,
  cameraWaypoints: [],
  resetCameraToken: 0,
  setFocusedPersonId: (id) => set({ focusedPersonId: id }),
  setHoveredPersonId: (id) => set({ hoveredPersonId: id }),
  setHighlightMode: (mode) => set({ highlightMode: mode }),
  setGenerationRange: (generationMin, generationMax) => set({ generationMin, generationMax }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setCinematicActive: (cinematicActive) =>
    set((s) => ({
      cinematicActive,
      cinematicPaused: cinematicActive ? s.cinematicPaused : false,
      tourIndex: cinematicActive ? 0 : s.tourIndex,
    })),
  setCinematicPaused: (cinematicPaused) => set({ cinematicPaused }),
  setTourIndex: (tourIndex) => set({ tourIndex }),
  setCameraWaypoints: (cameraWaypoints) => set({ cameraWaypoints, tourIndex: 0 }),
  requestCameraReset: () => set((s) => ({ resetCameraToken: s.resetCameraToken + 1, cinematicActive: false })),
  resetInteractionState: () =>
    set({
      highlightMode: 'none',
      searchQuery: '',
      cinematicActive: false,
      cinematicPaused: false,
      tourIndex: 0,
    }),
}));
