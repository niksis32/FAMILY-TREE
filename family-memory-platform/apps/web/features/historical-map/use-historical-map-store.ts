'use client';

import { create } from 'zustand';
import type { HistoricalMapMode, MapEvent, MapPayload, MapQuery } from '@family/shared';

export type MapSourceKind = 'person' | 'family' | 'tree';

interface HistoricalMapState {
  mode: HistoricalMapMode;
  sourceKind: MapSourceKind;
  sourceId: string;
  payload: MapPayload | null;
  loading: boolean;
  error: string | null;
  yearFrom: number | null;
  yearTo: number | null;
  eventTypes: string[];
  activeGeneration: number | null;
  selectedEvent: MapEvent | null;
  selectedPersonId: string | null;
  playerActive: boolean;
  playerPaused: boolean;
  playerProgress: number;
  playerSpeed: number;
  filters: MapQuery;
  setMode: (mode: HistoricalMapMode) => void;
  setSource: (kind: MapSourceKind, id: string) => void;
  setPayload: (payload: MapPayload | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setYearRange: (from: number | null, to: number | null) => void;
  setEventTypes: (types: string[]) => void;
  toggleEventType: (type: string) => void;
  setActiveGeneration: (generation: number | null) => void;
  setSelectedEvent: (event: MapEvent | null) => void;
  setSelectedPersonId: (id: string | null) => void;
  setPlayerActive: (active: boolean) => void;
  setPlayerPaused: (paused: boolean) => void;
  setPlayerProgress: (progress: number) => void;
  setPlayerSpeed: (speed: number) => void;
  setFilters: (filters: MapQuery) => void;
  resetPlayer: () => void;
}

export const useHistoricalMapStore = create<HistoricalMapState>((set) => ({
  mode: 'person-route',
  sourceKind: 'person',
  sourceId: '',
  payload: null,
  loading: false,
  error: null,
  yearFrom: null,
  yearTo: null,
  eventTypes: [],
  activeGeneration: null,
  selectedEvent: null,
  selectedPersonId: null,
  playerActive: false,
  playerPaused: false,
  playerProgress: 0,
  playerSpeed: 1,
  filters: { includeHistoricalNames: true },
  setMode: (mode) => set({ mode, selectedEvent: null, playerProgress: 0, playerActive: false }),
  setSource: (sourceKind, sourceId) => set({ sourceKind, sourceId }),
  setPayload: (payload) =>
    set({
      payload,
      yearFrom: payload?.meta.yearRange.min ?? null,
      yearTo: payload?.meta.yearRange.max ?? null,
    }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  setYearRange: (yearFrom, yearTo) => set({ yearFrom, yearTo, playerProgress: 0 }),
  setEventTypes: (eventTypes) => set({ eventTypes, playerProgress: 0 }),
  toggleEventType: (type) =>
    set((s) => {
      const upper = type.toUpperCase();
      const exists = s.eventTypes.includes(upper);
      return {
        eventTypes: exists ? s.eventTypes.filter((t) => t !== upper) : [...s.eventTypes, upper],
        playerProgress: 0,
      };
    }),
  setActiveGeneration: (activeGeneration) => set({ activeGeneration }),
  setSelectedEvent: (selectedEvent) => set({ selectedEvent }),
  setSelectedPersonId: (selectedPersonId) => set({ selectedPersonId }),
  setPlayerActive: (playerActive) => set({ playerActive, playerPaused: false, playerProgress: 0 }),
  setPlayerPaused: (playerPaused) => set({ playerPaused }),
  setPlayerProgress: (playerProgress) => set({ playerProgress }),
  setPlayerSpeed: (playerSpeed) => set({ playerSpeed }),
  setFilters: (filters) => set({ filters }),
  resetPlayer: () => set({ playerActive: false, playerPaused: false, playerProgress: 0 }),
}));
