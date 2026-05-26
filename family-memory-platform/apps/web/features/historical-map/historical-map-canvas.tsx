'use client';

import {
  activeStopAtProgress,
  buildGenerationMapLayers,
  buildHistoricalPlaceMarkers,
  fadeOpacityForGeneration,
  filterEventsByTypes,
  filterEventsByYear,
  getAnimationCoordinateAtProgress,
} from '@family/map-engine';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useEffect, useMemo, useRef } from 'react';
import { createEventMarkerElement } from './event-map-marker';
import { useHistoricalMapStore } from './use-historical-map-store';
import { useHistoricalMapStyle } from './use-historical-map-style';
import type { MapPayload } from '@family/shared';

interface HistoricalMapCanvasProps {
  payload: MapPayload;
  lite?: boolean;
}

function clearDynamicMapLayers(map: maplibregl.Map, prefix: string) {
  const style = map.getStyle();
  if (!style) return;
  for (const layer of style.layers ?? []) {
    if (layer.id.startsWith(prefix) && map.getLayer(layer.id)) map.removeLayer(layer.id);
  }
  for (const sourceId of Object.keys(style.sources ?? {})) {
    if (sourceId.startsWith(prefix) && map.getSource(sourceId)) map.removeSource(sourceId);
  }
}

export function HistoricalMapCanvas({ payload, lite = false }: HistoricalMapCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const playerMarkerRef = useRef<maplibregl.Marker | null>(null);
  const rafRef = useRef<number | null>(null);
  const progressRef = useRef(0);

  const mode = useHistoricalMapStore((s) => s.mode);
  const yearFrom = useHistoricalMapStore((s) => s.yearFrom);
  const yearTo = useHistoricalMapStore((s) => s.yearTo);
  const eventTypes = useHistoricalMapStore((s) => s.eventTypes);
  const activeGeneration = useHistoricalMapStore((s) => s.activeGeneration);
  const selectedPersonId = useHistoricalMapStore((s) => s.selectedPersonId);
  const playerActive = useHistoricalMapStore((s) => s.playerActive);
  const playerPaused = useHistoricalMapStore((s) => s.playerPaused);
  const playerProgress = useHistoricalMapStore((s) => s.playerProgress);
  const playerSpeed = useHistoricalMapStore((s) => s.playerSpeed);
  const setSelectedEvent = useHistoricalMapStore((s) => s.setSelectedEvent);
  const setPlayerProgress = useHistoricalMapStore((s) => s.setPlayerProgress);

  const { mapStyle, fallbackStyle, styleLoading, usingTileserver } = useHistoricalMapStyle();
  progressRef.current = playerProgress;

  const filteredEvents = useMemo(() => {
    let events = filterEventsByYear(payload.events, yearFrom ?? undefined, yearTo ?? undefined);
    events = filterEventsByTypes(events, eventTypes.length ? eventTypes : undefined);
    if (selectedPersonId && (mode === 'person-route' || mode === 'events-map')) {
      events = events.filter((e) => e.personId === selectedPersonId);
    }
    return events;
  }, [payload.events, yearFrom, yearTo, eventTypes, selectedPersonId, mode]);

  const visibleRoutes = useMemo(() => {
    if (mode === 'person-route' && selectedPersonId) {
      return payload.routes.filter((r) => r.personId === selectedPersonId);
    }
    if (mode === 'generation-map' && activeGeneration != null) {
      return payload.routes.filter((r) => (r.generation ?? 0) === activeGeneration);
    }
    if (mode === 'events-map' || mode === 'historical-places') return [];
    return payload.routes.slice(0, lite ? 3 : payload.routes.length);
  }, [payload.routes, mode, selectedPersonId, activeGeneration, lite]);

  const primaryRoute = visibleRoutes[0] ?? null;

  const mapCenter = useMemo((): [number, number] => {
    if (payload.meta.bounds) {
      return [
        (payload.meta.bounds.west + payload.meta.bounds.east) / 2,
        (payload.meta.bounds.south + payload.meta.bounds.north) / 2,
      ];
    }
    return [37.62, 55.75];
  }, [payload.meta.bounds]);

  useEffect(() => {
    if (!containerRef.current || !mapStyle || styleLoading) return;

    const container = containerRef.current;
    const style = mapStyle;
    let disposed = false;
    let map: maplibregl.Map | null = null;
    let fallbackApplied = false;

    map = new maplibregl.Map({
      container,
      style: style as maplibregl.StyleSpecification | string,
      center: mapCenter,
      zoom: payload.places.length ? 4 : 2,
      attributionControl: false,
      failIfMajorPerformanceCaveat: false,
    });

    map.addControl(new maplibregl.NavigationControl(), 'top-right');
    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');

    map.on('error', (event) => {
      if (disposed || fallbackApplied || usingTileserver === false) return;
      const message = String(event.error?.message ?? '');
      if (!message.includes('Failed to fetch') && !message.includes('load')) return;
      fallbackApplied = true;
      map?.setStyle(fallbackStyle);
    });

    mapRef.current = map;

    return () => {
      disposed = true;
      map?.remove();
      mapRef.current = null;
    };
  }, [mapStyle, styleLoading, mapCenter, payload.places.length, fallbackStyle, usingTileserver]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || styleLoading) return;

    const render = () => {
      if (!map.isStyleLoaded()) return;

      for (const marker of markersRef.current) marker.remove();
      markersRef.current = [];
      playerMarkerRef.current?.remove();
      playerMarkerRef.current = null;
      clearDynamicMapLayers(map, 'route-');

      if (mode === 'historical-places') {
        for (const item of buildHistoricalPlaceMarkers(payload.historicalAliases)) {
          const el = document.createElement('button');
          el.type = 'button';
          el.className = 'rounded-full bg-amber-900/90 px-2 py-1 text-[10px] text-amber-50 shadow';
          el.textContent = item.oldName.slice(0, 14);
          markersRef.current.push(
            new maplibregl.Marker({ element: el }).setLngLat([item.longitude, item.latitude]).addTo(map),
          );
        }
        return;
      }

      const generationLayers = mode === 'generation-map' ? buildGenerationMapLayers(payload, activeGeneration) : null;

      for (const route of visibleRoutes) {
        if (route.coordinates.length < 2) continue;
        const opacity =
          mode === 'generation-map' && generationLayers
            ? fadeOpacityForGeneration(route.generation ?? 0, activeGeneration)
            : 1;
        const sourceId = `route-${route.id}`;
        if (map.getSource(sourceId)) continue;

        map.addSource(sourceId, {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: { type: 'LineString', coordinates: route.coordinates },
          },
        });
        map.addLayer({
          id: `${sourceId}-line`,
          type: 'line',
          source: sourceId,
          paint: {
            'line-color': route.color ?? '#c9a227',
            'line-width': mode === 'person-route' ? 3 : 2,
            'line-opacity': opacity,
            'line-dasharray': mode === 'family-migration' ? [2, 1] : [1, 0],
          },
        });

        if (mode === 'person-route') {
          for (const stop of route.stops) {
            const el = document.createElement('div');
            el.className =
              'flex h-6 w-6 items-center justify-center rounded-full border-2 border-amber-100 bg-amber-800 text-[10px] font-bold text-amber-50 shadow';
            el.textContent = String(stop.order);
            markersRef.current.push(
              new maplibregl.Marker({ element: el }).setLngLat([stop.longitude, stop.latitude]).addTo(map),
            );
          }
        }
      }

      if (mode === 'events-map' || mode === 'person-route') {
        for (const event of filteredEvents) {
          if (event.latitude == null || event.longitude == null) continue;
          const el = createEventMarkerElement(event, () => setSelectedEvent(event));
          markersRef.current.push(
            new maplibregl.Marker({ element: el }).setLngLat([event.longitude, event.latitude]).addTo(map),
          );
        }
      }

      if (playerActive && primaryRoute) {
        const coord = getAnimationCoordinateAtProgress(primaryRoute, playerProgress);
        if (coord) {
          const el = document.createElement('div');
          el.className = 'h-4 w-4 rounded-full border-2 border-white bg-rose-600 shadow-lg';
          playerMarkerRef.current = new maplibregl.Marker({ element: el }).setLngLat(coord).addTo(map);
        }
      }
    };

    if (map.isStyleLoaded()) render();
    else map.once('load', render);

    return () => {
      for (const marker of markersRef.current) marker.remove();
      markersRef.current = [];
      playerMarkerRef.current?.remove();
      playerMarkerRef.current = null;
    };
  }, [
    visibleRoutes,
    filteredEvents,
    mode,
    payload,
    activeGeneration,
    playerActive,
    playerProgress,
    primaryRoute,
    setSelectedEvent,
    styleLoading,
  ]);

  useEffect(() => {
    if (!playerActive || playerPaused || !primaryRoute) return;
    let last = performance.now();
    const tick = (now: number) => {
      const delta = (now - last) / 1000;
      last = now;
      const next = Math.min(1, progressRef.current + delta * 0.04 * playerSpeed);
      setPlayerProgress(next);
      const stop = activeStopAtProgress(primaryRoute, next);
      if (stop) {
        const event = payload.events.find((e) => e.id === stop.eventId);
        if (event) setSelectedEvent(event);
      }
      if (next < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [playerActive, playerPaused, playerSpeed, primaryRoute, payload.events, setSelectedEvent, setPlayerProgress]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !payload.meta.bounds || styleLoading) return;
    const runFit = () => {
      if (!map.isStyleLoaded()) {
        map.once('load', runFit);
        return;
      }
      map.fitBounds(
        [
          [payload.meta.bounds!.west, payload.meta.bounds!.south],
          [payload.meta.bounds!.east, payload.meta.bounds!.north],
        ],
        { padding: 48, maxZoom: 8, duration: lite ? 0 : 800 },
      );
    };
    runFit();
  }, [payload.meta.bounds, lite, styleLoading]);

  return (
    <div className="relative">
      {styleLoading && (
        <p className="absolute inset-0 z-10 flex items-center justify-center text-sm text-stone-500">
          Loading map tiles…
        </p>
      )}
      <div
        ref={containerRef}
        className="relative h-[min(70vh,720px)] w-full overflow-hidden rounded-3xl border border-amber-200/40 shadow-inner dark:border-amber-900/30"
        style={{
          background: 'radial-gradient(circle at center, rgba(247,240,223,0.35), rgba(62,47,32,0.15))',
          visibility: styleLoading ? 'hidden' : 'visible',
        }}
      />
    </div>
  );
}
