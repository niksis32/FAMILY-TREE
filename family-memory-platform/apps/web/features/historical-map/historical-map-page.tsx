'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import type { HistoricalMapMode, MapPayload } from '@family/shared';
import { useAuth } from '@/components/auth-provider';
import { Badge, Card, FormField, Select } from '@/components/ui';
import { apiClient, formatApiError } from '@/lib/api-client';
import { formatPersonLabel } from '@/lib/person-display';
import type { PersonSummary } from '@family/shared';
import { useRouter } from '@/i18n/navigation';
import { FamilyMap } from './family-map';
import { MapTimelineSlider } from './map-timeline-slider';
import { MigrationPlayer } from './migration-player';
import { PersonRouteMap } from './person-route-map';
import { PlaceInsightPanel } from './place-insight-panel';
import { useHistoricalMapStore } from './use-historical-map-store';

const MODES: HistoricalMapMode[] = [
  'person-route',
  'family-migration',
  'generation-map',
  'events-map',
  'historical-places',
];

const EVENT_TYPE_OPTIONS = [
  'BIRTH',
  'DEATH',
  'MARRIAGE',
  'MILITARY',
  'WORK',
  'MIGRATION',
  'RESIDENCE',
  'IMMIGRATION',
  'EDUCATION',
];

export function HistoricalMapPage() {
  const { session } = useAuth();
  const t = useTranslations('historicalMap');
  const router = useRouter();
  const searchParams = useSearchParams();

  const [persons, setPersons] = useState<PersonSummary[]>([]);
  const [families, setFamilies] = useState<Array<{ id: string; name?: string | null }>>([]);
  const [personId, setPersonId] = useState('');
  const [familyId, setFamilyId] = useState('');
  const [sourceKind, setSourceKind] = useState<'person' | 'family' | 'tree'>('person');

  const mode = useHistoricalMapStore((s) => s.mode);
  const payload = useHistoricalMapStore((s) => s.payload);
  const loading = useHistoricalMapStore((s) => s.loading);
  const error = useHistoricalMapStore((s) => s.error);
  const yearFrom = useHistoricalMapStore((s) => s.yearFrom);
  const yearTo = useHistoricalMapStore((s) => s.yearTo);
  const eventTypes = useHistoricalMapStore((s) => s.eventTypes);
  const selectedEvent = useHistoricalMapStore((s) => s.selectedEvent);
  const selectedPersonId = useHistoricalMapStore((s) => s.selectedPersonId);
  const setMode = useHistoricalMapStore((s) => s.setMode);
  const setPayload = useHistoricalMapStore((s) => s.setPayload);
  const setLoading = useHistoricalMapStore((s) => s.setLoading);
  const setError = useHistoricalMapStore((s) => s.setError);
  const toggleEventType = useHistoricalMapStore((s) => s.toggleEventType);
  const setSelectedEvent = useHistoricalMapStore((s) => s.setSelectedEvent);
  const setSelectedPersonId = useHistoricalMapStore((s) => s.setSelectedPersonId);

  useEffect(() => {
    const qPerson = searchParams.get('personId');
    const qMode = searchParams.get('mode') as HistoricalMapMode | null;
    if (qPerson) {
      setPersonId(qPerson);
      setSourceKind('person');
      setSelectedPersonId(qPerson);
    }
    if (qMode && MODES.includes(qMode)) setMode(qMode);
  }, [searchParams, setMode, setSelectedPersonId]);

  useEffect(() => {
    void Promise.all([
      apiClient.persons.list(session?.accessToken).then(setPersons),
      apiClient.families.list(session?.accessToken).then(setFamilies),
    ]).catch((err) => setError(formatApiError(err)));
  }, [session?.accessToken, setError]);

  useEffect(() => {
    if (!personId && persons.length > 0) setPersonId(persons[0]!.id);
  }, [persons, personId]);

  const loadMap = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const query = {
        yearFrom: yearFrom ?? undefined,
        yearTo: yearTo ?? undefined,
        eventTypes: eventTypes.length ? eventTypes : undefined,
        includeHistoricalNames: true,
      };
      let data: MapPayload;
      if (sourceKind === 'family' && familyId) {
        data = await apiClient.map.family(familyId, query, session?.accessToken);
      } else if (sourceKind === 'tree' && personId) {
        data = await apiClient.map.tree(personId, { ...query, scope: 'full', depth: 10 }, session?.accessToken);
      } else if (personId) {
        data = await apiClient.map.person(personId, query, session?.accessToken);
      } else {
        setPayload(null);
        return;
      }
      setPayload(data);
      if (!selectedPersonId && data.persons[0]) setSelectedPersonId(data.persons[0].id);
    } catch (err) {
      setError(formatApiError(err));
      setPayload(null);
    } finally {
      setLoading(false);
    }
  }, [
    sourceKind,
    familyId,
    personId,
    yearFrom,
    yearTo,
    eventTypes,
    session?.accessToken,
    setLoading,
    setError,
    setPayload,
    selectedPersonId,
    setSelectedPersonId,
  ]);

  useEffect(() => {
    void loadMap();
  }, [loadMap]);

  const yearBounds = useMemo(() => {
    const min = payload?.meta.yearRange.min ?? 1850;
    const max = payload?.meta.yearRange.max ?? new Date().getFullYear();
    return { min, max: Math.max(min, max) };
  }, [payload]);

  const selectedPlace = useMemo(() => {
    if (!payload || !selectedEvent?.placeId) return null;
    return payload.places.find((p) => p.id === selectedEvent.placeId) ?? null;
  }, [payload, selectedEvent]);

  const personLabel = useMemo(() => {
    if (!selectedEvent?.personId) return null;
    return payload?.persons.find((p) => p.id === selectedEvent.personId)?.label ?? null;
  }, [payload, selectedEvent]);

  const timelineHref = selectedPersonId || personId ? `/timeline?personId=${selectedPersonId || personId}` : undefined;

  const mapView = payload ? (
    mode === 'person-route' || mode === 'events-map' ? (
      <PersonRouteMap payload={payload} />
    ) : (
      <FamilyMap payload={payload} />
    )
  ) : null;

  return (
    <div className="space-y-6">
      <div>
        <Badge>{t('badge')}</Badge>
        <h1 className="mt-3 font-serif text-3xl font-semibold text-family-ink dark:text-amber-50">{t('title')}</h1>
        <p className="mt-2 max-w-3xl text-sm text-stone-500 dark:text-slate-400">{t('subtitle')}</p>
      </div>

      <Card className="grid gap-4 p-4 md:grid-cols-2 lg:grid-cols-4">
        <FormField label={t('sourceKind')}>
          <Select value={sourceKind} onChange={(e) => setSourceKind(e.target.value as typeof sourceKind)}>
            <option value="person">{t('sourcePerson')}</option>
            <option value="family">{t('sourceFamily')}</option>
            <option value="tree">{t('sourceTree')}</option>
          </Select>
        </FormField>
        {sourceKind === 'family' ? (
          <FormField label={t('family')}>
            <Select value={familyId} onChange={(e) => setFamilyId(e.target.value)}>
              <option value="">{t('selectFamily')}</option>
              {families.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name ?? f.id}
                </option>
              ))}
            </Select>
          </FormField>
        ) : (
          <FormField label={t('person')}>
            <Select
              value={personId}
              onChange={(e) => {
                setPersonId(e.target.value);
                setSelectedPersonId(e.target.value);
              }}
            >
              {persons.map((p) => (
                <option key={p.id} value={p.id}>
                  {formatPersonLabel(p)}
                </option>
              ))}
            </Select>
          </FormField>
        )}
        <FormField label={t('focusPerson')}>
          <Select value={selectedPersonId ?? ''} onChange={(e) => setSelectedPersonId(e.target.value || null)}>
            <option value="">{t('allPersons')}</option>
            {(payload?.persons ?? []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </Select>
        </FormField>
      </Card>

      <div className="flex flex-wrap gap-2">
        {MODES.map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium ${
              mode === m
                ? 'bg-amber-800 text-amber-50 shadow'
                : 'bg-stone-100 text-stone-600 dark:bg-slate-800 dark:text-slate-300'
            }`}
          >
            {t(`modes.${m}`)}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {EVENT_TYPE_OPTIONS.map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => toggleEventType(type)}
            className={`rounded-full border px-2.5 py-1 text-[11px] ${
              eventTypes.includes(type)
                ? 'border-amber-700 bg-amber-100 text-amber-900'
                : 'border-stone-200 text-stone-500'
            }`}
          >
            {type}
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="relative">
          {loading && <p className="mb-2 text-sm text-stone-500">{t('loading')}</p>}
          {error && <p className="mb-2 text-sm text-red-600">{error}</p>}
          {!loading && payload && payload.places.length === 0 && (
            <p className="mb-2 rounded-2xl border p-6 text-center text-sm text-stone-500">{t('noPlaces')}</p>
          )}
          {mapView}
          <PlaceInsightPanel
            event={selectedEvent}
            place={selectedPlace}
            personLabel={personLabel}
            onClose={() => setSelectedEvent(null)}
            onOpenTimeline={(id) => router.push(`/timeline?personId=${id}`)}
            onOpen3DTree={(id) => router.push(`/tree?personId=${id}&mode=three-d`)}
          />
        </div>
        <div className="space-y-4">
          <MapTimelineSlider minYear={yearBounds.min} maxYear={yearBounds.max} timelineHref={timelineHref} />
          {(mode === 'person-route' || mode === 'family-migration') && <MigrationPlayer />}
          {payload && (
            <Card className="p-4 text-sm text-stone-600 dark:text-slate-300">
              <p>
                {t('statsEvents')}: {payload.meta.eventCount}
              </p>
              <p>
                {t('statsPlaces')}: {payload.meta.placeCount}
              </p>
              <p>
                {t('statsRoutes')}: {payload.routes.length}
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

