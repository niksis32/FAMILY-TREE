'use client';

import { buildMapLayout } from '@family/tree-experience';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { useTreeViewData } from './tree-view-data-context';

export default function MapTreeView() {
  const { data, setSelectedNode } = useTreeViewData();
  const t = useTranslations('treeExperience');
  const mapRef = useRef<maplibregl.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || !data) return;

    const { markers, lines } = buildMapLayout(data);
    mapRef.current?.remove();
    mapRef.current = null;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: {
        version: 8,
        sources: {
          osm: {
            type: 'raster',
            tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
            attribution: '© OpenStreetMap',
          },
        },
        layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
      },
      center: markers[0] ? [markers[0].longitude, markers[0].latitude] : [37.62, 55.75],
      zoom: markers.length ? 4 : 2,
    });

    map.addControl(new maplibregl.NavigationControl(), 'top-right');

    for (const marker of markers) {
      const el = document.createElement('button');
      el.className =
        'rounded-full bg-family-primary px-2 py-1 text-[10px] font-bold text-white shadow dark:bg-family-accent dark:text-slate-950';
      el.textContent = marker.name.slice(0, 12);
      el.onclick = () => {
        const personId = marker.personIds[0];
        const person = data.nodes.find((n) => n.personId === personId);
        if (person) setSelectedNode(person);
      };

      new maplibregl.Marker({ element: el }).setLngLat([marker.longitude, marker.latitude]).addTo(map);
    }

    if (lines.length > 0) {
      map.on('load', () => {
        for (const line of lines) {
          map.addSource(line.id, {
            type: 'geojson',
            data: {
              type: 'Feature',
              properties: {},
              geometry: { type: 'LineString', coordinates: line.coordinates },
            },
          });
          map.addLayer({
            id: `${line.id}-layer`,
            type: 'line',
            source: line.id,
            paint: { 'line-color': '#d4a853', 'line-width': 2 },
          });
        }
      });
    }

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [data, setSelectedNode]);

  if (!data) {
    return <p className="p-8 text-center text-sm text-stone-500">{t('empty')}</p>;
  }

  const { markers } = buildMapLayout(data);
  if (markers.length === 0) {
    return (
      <p className="rounded-3xl border p-8 text-center text-sm text-stone-500 dark:border-slate-800">
        {t('mapNoPlaces')}
      </p>
    );
  }

  return (
    <div
      ref={containerRef}
      className="h-[min(70vh,720px)] w-full overflow-hidden rounded-3xl border dark:border-slate-800"
    />
  );
}
