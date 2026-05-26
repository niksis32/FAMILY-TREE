'use client';

import { buildMapLayout } from '@family/tree-experience';
import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import type { MapPayload } from '@family/shared';
import { PersonRouteMapLite } from '@/features/historical-map/person-route-map';
import { useTreeViewData } from './tree-view-data-context';

function treeDataToMapPayload(data: NonNullable<ReturnType<typeof useTreeViewData>['data']>): MapPayload {
  const persons = data.nodes.map((node) => ({
    id: node.personId,
    label: node.label,
    generation: node.generation,
  }));

  const events = data.events.map((event) => {
    const place = event.placeId ? data.places.find((p) => p.id === event.placeId) : null;
    return {
      id: event.id,
      personId: event.personId,
      familyId: event.familyId,
      type: event.type,
      title: event.title,
      date: event.date,
      year: event.year,
      placeId: event.placeId,
      placeName: event.placeName,
      latitude: place?.latitude ?? null,
      longitude: place?.longitude ?? null,
    };
  });

  const places = data.places
    .filter((p) => p.latitude != null && p.longitude != null)
    .map((p) => ({
      id: p.id,
      name: p.name,
      latitude: p.latitude!,
      longitude: p.longitude!,
      country: p.country,
      region: p.region,
      city: p.city,
      eventIds: p.eventIds,
      personIds: p.personIds,
    }));

  const { lines } = buildMapLayout(data);
  const routes = lines.map((line) => {
    const person = persons.find((p) => p.id === line.personId);
    return {
      id: line.id,
      personId: line.personId ?? 'unknown',
      personLabel: person?.label ?? 'Unknown',
      generation: person?.generation ?? null,
      color: '#c9a227',
      coordinates: line.coordinates,
      stops: [],
    };
  });

  const years = events.map((e) => e.year).filter((y): y is number => y != null);
  const bounds =
    places.length > 0
      ? {
          west: Math.min(...places.map((p) => p.longitude)),
          south: Math.min(...places.map((p) => p.latitude)),
          east: Math.max(...places.map((p) => p.longitude)),
          north: Math.max(...places.map((p) => p.latitude)),
        }
      : null;

  return {
    meta: {
      sourceType: 'tree',
      sourceId: data.meta.rootPersonId,
      generatedAt: data.meta.generatedAt,
      yearRange: {
        min: years.length ? Math.min(...years) : null,
        max: years.length ? Math.max(...years) : null,
      },
      eventCount: events.length,
      placeCount: places.length,
      bounds,
      filtersApplied: {},
    },
    persons,
    places,
    events,
    routes,
    generations: [],
    historicalAliases: [],
  };
}

export default function MapTreeView() {
  const { data } = useTreeViewData();
  const t = useTranslations('treeExperience');
  const payload = useMemo(() => (data ? treeDataToMapPayload(data) : null), [data]);

  if (!payload) {
    return <p className="p-8 text-center text-sm text-stone-500">{t('empty')}</p>;
  }

  if (payload.places.length === 0) {
    return (
      <p className="rounded-3xl border p-8 text-center text-sm text-stone-500 dark:border-slate-800">
        {t('mapNoPlaces')}
      </p>
    );
  }

  return <PersonRouteMapLite payload={payload} />;
}
