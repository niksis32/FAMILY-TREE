export type TileSourceKind = 'tileserver-gl' | 'remote-fallback';

export interface MapTileConfig {
  kind: TileSourceKind;
  /** TileServer GL base URL, e.g. http://localhost:8080 */
  tileserverUrl?: string;
  /** Style path on tileserver, e.g. /styles/basic/style.json */
  stylePath?: string;
  /** Remote raster fallback when tileserver unavailable */
  remoteTiles?: string[];
  attribution: string;
}

const DEFAULT_TILESERVER = 'http://localhost:8080';
const DEFAULT_STYLE = '/styles/basic/style.json';

export function resolveMapTileConfig(env?: {
  tileserverUrl?: string;
  stylePath?: string;
  kind?: TileSourceKind;
}): MapTileConfig {
  const tileserverUrl = env?.tileserverUrl?.replace(/\/$/, '') ?? DEFAULT_TILESERVER;
  const kind = env?.kind ?? 'remote-fallback';
  return {
    kind,
    tileserverUrl,
    stylePath: env?.stylePath ?? DEFAULT_STYLE,
    remoteTiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
    attribution: kind === 'tileserver-gl' ? '© Local TileServer GL' : '© OpenStreetMap',
  };
}

export function tileserverStyleUrl(config: MapTileConfig): string {
  return `${config.tileserverUrl ?? DEFAULT_TILESERVER}${config.stylePath ?? DEFAULT_STYLE}`;
}

export interface VintageStyleOptions {
  tileUrl: string;
  tileAttribution: string;
  parchmentOverlay?: boolean;
}

/** MapLibre Style Spec — sepia vintage raster base */
export function createVintageStyle(options: VintageStyleOptions) {
  return {
    version: 8 as const,
    name: 'Historical Family Map',
    metadata: { 'mapbox:autocomposite': false },
    sources: {
      'vintage-base': {
        type: 'raster' as const,
        tiles: [options.tileUrl],
        tileSize: 256,
        attribution: options.tileAttribution,
      },
    },
    layers: [
      {
        id: 'vintage-base',
        type: 'raster' as const,
        source: 'vintage-base',
        paint: {
          'raster-saturation': -0.65,
          'raster-contrast': 0.15,
          'raster-brightness-min': 0.05,
          'raster-brightness-max': 0.85,
          'raster-hue-rotate': 15,
        },
      },
    ],
  };
}

export function createRemoteFallbackStyle(config: MapTileConfig) {
  const tiles = config.remoteTiles ?? ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'];
  return createVintageStyle({
    tileUrl: tiles[0]!,
    tileAttribution: config.attribution,
  });
}

export function resolveMapStyle(config: MapTileConfig) {
  if (config.kind === 'tileserver-gl') {
    return tileserverStyleUrl(config);
  }
  return createRemoteFallbackStyle(config);
}

/** Quick reachability check before MapLibre loads a TileServer style URL. */
export async function probeTileserverStyle(styleUrl: string, timeoutMs = 2500): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(styleUrl, {
      method: 'GET',
      signal: controller.signal,
      cache: 'no-store',
    });
    return response.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}
