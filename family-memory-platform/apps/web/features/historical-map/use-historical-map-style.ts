'use client';

import {
  createRemoteFallbackStyle,
  probeTileserverStyle,
  resolveMapTileConfig,
  tileserverStyleUrl,
} from '@family/map-engine';
import type maplibregl from 'maplibre-gl';
import { useEffect, useMemo, useState } from 'react';

export type MapTileMode = 'auto' | 'remote' | 'tileserver-gl';

function readTileMode(): MapTileMode {
  const raw = process.env.NEXT_PUBLIC_MAP_TILE_SOURCE?.trim().toLowerCase();
  if (raw === 'remote' || raw === 'tileserver-gl') return raw;
  return 'auto';
}

export function useHistoricalMapStyle() {
  const config = useMemo(() => {
    const tileserverUrl = process.env.NEXT_PUBLIC_TILESERVER_URL ?? 'http://localhost:8080';
    const stylePath = process.env.NEXT_PUBLIC_TILESERVER_STYLE ?? '/styles/basic/style.json';
    const mode = readTileMode();
    const kind = mode === 'remote' ? ('remote-fallback' as const) : ('tileserver-gl' as const);
    return resolveMapTileConfig({ tileserverUrl, stylePath, kind });
  }, []);

  const fallbackStyle = useMemo(
    () => createRemoteFallbackStyle(config) as maplibregl.StyleSpecification,
    [config],
  );

  const tileserverStyleUrlResolved = useMemo(() => tileserverStyleUrl(config), [config]);

  const [mapStyle, setMapStyle] = useState<maplibregl.StyleSpecification | string | null>(null);
  const [usingTileserver, setUsingTileserver] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const mode = readTileMode();

    async function resolve() {
      if (mode === 'remote') {
        if (!cancelled) {
          setUsingTileserver(false);
          setMapStyle(fallbackStyle);
        }
        return;
      }

      if (mode === 'tileserver-gl') {
        const ok = await probeTileserverStyle(tileserverStyleUrlResolved);
        if (!cancelled) {
          setUsingTileserver(ok);
          setMapStyle(ok ? tileserverStyleUrlResolved : fallbackStyle);
        }
        return;
      }

      const ok = await probeTileserverStyle(tileserverStyleUrlResolved);
      if (!cancelled) {
        setUsingTileserver(ok);
        setMapStyle(ok ? tileserverStyleUrlResolved : fallbackStyle);
      }
    }

    setMapStyle(null);
    void resolve();

    return () => {
      cancelled = true;
    };
  }, [fallbackStyle, tileserverStyleUrlResolved]);

  return {
    mapStyle,
    fallbackStyle,
    usingTileserver,
    styleLoading: mapStyle === null,
    tileserverStyleUrl: tileserverStyleUrlResolved,
  };
}
