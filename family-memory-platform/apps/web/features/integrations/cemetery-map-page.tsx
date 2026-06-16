'use client';

import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { useAuth } from '@/components/auth-provider';
import { Button } from '@/components/ui';
import { PageHero } from '@family/ui';
import { apiClient, formatApiError } from '@/lib/api-client';
import { useHistoricalMapStyle } from '@/features/historical-map/use-historical-map-style';

type CemeteryMarker = {
  id: string;
  cemeteryName: string;
  plotLabel: string | null;
  latitude: number;
  longitude: number;
  person: { id: string; displayName: string } | null;
};

export function CemeteryMapPage() {
  const { session, isReady } = useAuth();
  const t = useTranslations('block5.cemetery');
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const [markers, setMarkers] = useState<CemeteryMarker[]>([]);
  const [error, setError] = useState('');
  const { mapStyle, fallbackStyle, styleLoading } = useHistoricalMapStyle();
  const resolvedStyle = useMemo(() => mapStyle ?? fallbackStyle, [mapStyle, fallbackStyle]);

  useEffect(() => {
    if (!isReady || !session?.accessToken) return;
    void (async () => {
      try {
        const data = (await apiClient.cemetery.map(session.accessToken)) as { markers?: CemeteryMarker[] };
        setMarkers(data.markers ?? []);
      } catch (err) {
        setError(formatApiError(err));
      }
    })();
  }, [isReady, session?.accessToken]);

  useEffect(() => {
    if (!containerRef.current || styleLoading || !resolvedStyle) return;
    if (mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: resolvedStyle,
      center: [37.6173, 55.7558],
      zoom: 4,
    });
    map.addControl(new maplibregl.NavigationControl(), 'top-right');
    mapRef.current = map;

    return () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      map.remove();
      mapRef.current = null;
    };
  }, [resolvedStyle, styleLoading]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const render = () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];

      if (markers.length === 0) return;

      const bounds = new maplibregl.LngLatBounds();
      for (const marker of markers) {
        const el = document.createElement('button');
        el.type = 'button';
        el.className =
          'rounded-full border-2 border-white bg-emerald-700 px-2 py-1 text-[10px] font-medium text-white shadow';
        el.textContent = marker.plotLabel ?? '⚰';
        el.title = marker.person?.displayName ?? marker.cemeteryName;

        const popup = new maplibregl.Popup({ offset: 16 }).setHTML(
          `<strong>${marker.person?.displayName ?? marker.plotLabel ?? marker.cemeteryName}</strong><br/>${marker.cemeteryName}`,
        );

        const mapMarker = new maplibregl.Marker({ element: el })
          .setLngLat([marker.longitude, marker.latitude])
          .setPopup(popup)
          .addTo(map);
        markersRef.current.push(mapMarker);
        bounds.extend([marker.longitude, marker.latitude]);
      }

      if (markers.length === 1) {
        map.flyTo({ center: [markers[0]!.longitude, markers[0]!.latitude], zoom: 15 });
      } else {
        map.fitBounds(bounds, { padding: 48, maxZoom: 14 });
      }
    };

    if (map.isStyleLoaded()) render();
    else map.once('load', render);
  }, [markers]);

  return (
    <div className="space-y-4">
      <PageHero
        eyebrow={t('eyebrow')}
        title={t('mapTitle')}
        description={t('mapDescription')}
        action={
          <Link href="/cemeteries">
            <Button variant="secondary">{t('backToHub')}</Button>
          </Link>
        }
      />
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <div ref={containerRef} className="h-[min(70vh,640px)] w-full overflow-hidden rounded-xl border dark:border-slate-700" />
      {markers.length > 0 ? (
        <ul className="grid gap-2 md:grid-cols-2">
          {markers.map((m) => (
            <li key={m.id} className="flex items-center justify-between rounded border p-3 text-sm dark:border-slate-700">
              <span>{m.person?.displayName ?? m.plotLabel ?? m.cemeteryName}</span>
              <Link href={`/cemeteries/3d/${m.id}`}>
                <Button type="button" variant="secondary">
                  {t('view3d')}
                </Button>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-stone-500">{t('noMarkers')}</p>
      )}
    </div>
  );
}
