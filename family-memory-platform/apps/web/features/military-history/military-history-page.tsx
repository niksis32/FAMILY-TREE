'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { AppLocale, MapPayload, PersonSummary } from '@family/shared';
import { useLocale, useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { Link } from '@/i18n/navigation';
import { useAuth } from '@/components/auth-provider';
import { Badge, Button, Card, FormField, Input, Select } from '@/components/ui';
import { HistoricalMapCanvas } from '@/features/historical-map/historical-map-canvas';
import { useHistoricalMapStore } from '@/features/historical-map/use-historical-map-store';
import { apiClient, formatApiError, type MilitaryConflictRecord } from '@/lib/api-client';
import {
  BUILTIN_CONFLICTS,
  type BuiltinConflictId,
  getBuiltinConflictLabel,
} from '@/lib/military-conflict-labels';
import { formatPersonLabel } from '@/lib/person-display';
import { PageHero } from '@family/ui';

type ConflictKey = BuiltinConflictId | string;

interface CustomConflict {
  id: string;
  name: string;
  color: string | null;
}

interface MilitaryStop {
  id: string;
  conflict: ConflictKey;
  order: number;
  year: number;
  title: string;
  place: string;
  description: string;
  coordinates: [number, number];
}

interface ConflictOption {
  id: ConflictKey;
  label: string;
  color: string;
  isCustom: boolean;
}

const CUSTOM_COLOR_PALETTE = ['#6366f1', '#0d9488', '#dc2626', '#7c3aed', '#0891b2', '#ca8a04'];
const CONFLICT_NAME_PATTERN = /^[\p{L}\p{N}\s.,\-–—()'"/]{2,120}$/u;

function calculateBounds(stops: MilitaryStop[]) {
  if (stops.length === 0) return null;
  const longitudes = stops.map((stop) => stop.coordinates[0]);
  const latitudes = stops.map((stop) => stop.coordinates[1]);
  return {
    west: Math.min(...longitudes),
    south: Math.min(...latitudes),
    east: Math.max(...longitudes),
    north: Math.max(...latitudes),
  };
}

function buildMilitaryPayload(
  stops: MilitaryStop[],
  personId: string,
  personLabel: string,
  conflictOptions: ConflictOption[],
): MapPayload {
  const visibleStops = stops.length > 0 ? stops : [];
  const yearRange = visibleStops.reduce(
    (acc, stop) => ({ min: Math.min(acc.min, stop.year), max: Math.max(acc.max, stop.year) }),
    { min: visibleStops[0]?.year ?? 1914, max: visibleStops[0]?.year ?? 1945 },
  );

  const routes = conflictOptions
    .map((conflict) => {
      const routeStops = visibleStops.filter((stop) => stop.conflict === conflict.id);
      if (routeStops.length === 0) return null;
      return {
        id: `military-route-${conflict.id}`,
        personId,
        personLabel,
        color: conflict.color,
        coordinates: routeStops.map((stop) => stop.coordinates),
        stops: routeStops.map((stop, index) => ({
          eventId: `event-${stop.id}`,
          order: index + 1,
          longitude: stop.coordinates[0],
          latitude: stop.coordinates[1],
          year: stop.year,
          label: stop.title,
          type: 'MILITARY',
        })),
      };
    })
    .filter((route): route is NonNullable<typeof route> => route != null);

  return {
    meta: {
      sourceType: 'person',
      sourceId: personId,
      generatedAt: new Date().toISOString(),
      yearRange,
      eventCount: visibleStops.length,
      placeCount: visibleStops.length,
      bounds: calculateBounds(visibleStops),
      filtersApplied: { eventTypes: ['MILITARY'], includeHistoricalNames: true },
    },
    persons: [{ id: personId, label: personLabel }],
    places: visibleStops.map((stop) => ({
      id: `place-${stop.id}`,
      name: stop.place,
      displayName: stop.place,
      latitude: stop.coordinates[1],
      longitude: stop.coordinates[0],
      eventIds: [`event-${stop.id}`],
      personIds: [personId],
    })),
    events: visibleStops.map((stop) => ({
      id: `event-${stop.id}`,
      personId,
      type: 'MILITARY',
      title: stop.title,
      description: stop.description,
      year: stop.year,
      date: `${stop.year}`,
      placeId: `place-${stop.id}`,
      placeName: stop.place,
      latitude: stop.coordinates[1],
      longitude: stop.coordinates[0],
      sequence: stop.order,
    })),
    routes,
    generations: [],
    historicalAliases: [],
  };
}

export function MilitaryHistoryPage() {
  const t = useTranslations('militaryHistory');
  const locale = useLocale() as AppLocale;
  const searchParams = useSearchParams();
  const reviewFocusId = searchParams.get('review');
  const { session, isReady } = useAuth();
  const setMode = useHistoricalMapStore((state) => state.setMode);
  const setSelectedPersonId = useHistoricalMapStore((state) => state.setSelectedPersonId);
  const resetPlayer = useHistoricalMapStore((state) => state.resetPlayer);

  const [persons, setPersons] = useState<PersonSummary[]>([]);
  const [personId, setPersonId] = useState('demo-veteran');
  const [conflict, setConflict] = useState<ConflictKey | 'all'>('ww2');
  const [customConflicts, setCustomConflicts] = useState<CustomConflict[]>([]);
  const [pendingConflicts, setPendingConflicts] = useState<MilitaryConflictRecord[]>([]);
  const [myProposals, setMyProposals] = useState<MilitaryConflictRecord[]>([]);
  const [reviewEdits, setReviewEdits] = useState<Record<string, string>>({});
  const [isModerator, setIsModerator] = useState(false);
  const [newConflictName, setNewConflictName] = useState('');
  const [savingConflict, setSavingConflict] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [proposalModalName, setProposalModalName] = useState<string | null>(null);

  const canPropose = Boolean(session?.accessToken);

  const conflictOptions = useMemo<ConflictOption[]>(() => {
    const builtins = BUILTIN_CONFLICTS.map((item) => ({
      id: item.id,
      label: getBuiltinConflictLabel(item.id, locale, t),
      color: item.color,
      isCustom: false,
    }));
    const custom = customConflicts.map((item, index) => ({
      id: item.id,
      label: item.name,
      color: item.color ?? CUSTOM_COLOR_PALETTE[index % CUSTOM_COLOR_PALETTE.length]!,
      isCustom: true,
    }));
    return [...builtins, ...custom];
  }, [customConflicts, locale, t]);

  const getConflictLabel = useCallback(
    (id: ConflictKey) => conflictOptions.find((item) => item.id === id)?.label ?? id,
    [conflictOptions],
  );

  const loadCustomConflicts = useCallback(async () => {
    if (!session?.accessToken) return;
    try {
      const [approved, mine] = await Promise.all([
        apiClient.militaryHistory.listConflicts(session.accessToken),
        apiClient.militaryHistory.listMyProposals(session.accessToken),
      ]);
      setCustomConflicts(approved.map((row) => ({ id: row.id, name: row.name, color: row.color })));
      setMyProposals(mine);

      try {
        const pending = await apiClient.militaryHistory.listPending(session.accessToken);
        setPendingConflicts(pending);
        setReviewEdits(Object.fromEntries(pending.map((row) => [row.id, row.name])));
        setIsModerator(true);
      } catch {
        setPendingConflicts([]);
        setIsModerator(false);
      }
    } catch (err) {
      setError(formatApiError(err));
    }
  }, [session?.accessToken]);

  useEffect(() => {
    setMode('person-route');
  }, [setMode]);

  useEffect(() => {
    if (!isReady || !session?.accessToken) return;
    void Promise.all([
      apiClient.persons.list(session.accessToken).then(setPersons),
      loadCustomConflicts(),
    ]).catch((err) => setError(formatApiError(err)));
  }, [isReady, loadCustomConflicts, session?.accessToken]);

  const personLabel = useMemo(() => {
    const selected = persons.find((person) => person.id === personId);
    return selected ? formatPersonLabel(selected) : t('demoPerson');
  }, [personId, persons, t]);

  useEffect(() => {
    setSelectedPersonId(personId);
    resetPlayer();
  }, [personId, resetPlayer, setSelectedPersonId]);

  const stops = useMemo<MilitaryStop[]>(
    () => [
      {
        id: 'ww1-front',
        conflict: 'ww1',
        order: 1,
        year: 1916,
        title: t('stops.ww1Front.title'),
        place: t('stops.ww1Front.place'),
        description: t('stops.ww1Front.description'),
        coordinates: [25.2797, 54.6872],
      },
      {
        id: 'civil-rail',
        conflict: 'civil',
        order: 2,
        year: 1919,
        title: t('stops.civilRail.title'),
        place: t('stops.civilRail.place'),
        description: t('stops.civilRail.description'),
        coordinates: [60.6057, 56.8389],
      },
      {
        id: 'ww2-smolensk',
        conflict: 'ww2',
        order: 3,
        year: 1941,
        title: t('stops.ww2Smolensk.title'),
        place: t('stops.ww2Smolensk.place'),
        description: t('stops.ww2Smolensk.description'),
        coordinates: [32.0453, 54.7826],
      },
      {
        id: 'ww2-stalingrad',
        conflict: 'ww2',
        order: 4,
        year: 1942,
        title: t('stops.ww2Stalingrad.title'),
        place: t('stops.ww2Stalingrad.place'),
        description: t('stops.ww2Stalingrad.description'),
        coordinates: [44.5018, 48.708],
      },
      {
        id: 'ww2-berlin',
        conflict: 'ww2',
        order: 5,
        year: 1945,
        title: t('stops.ww2Berlin.title'),
        place: t('stops.ww2Berlin.place'),
        description: t('stops.ww2Berlin.description'),
        coordinates: [13.405, 52.52],
      },
      {
        id: 'local-memory',
        conflict: 'local',
        order: 6,
        year: 1985,
        title: t('stops.localMemory.title'),
        place: t('stops.localMemory.place'),
        description: t('stops.localMemory.description'),
        coordinates: [69.2075, 34.5553],
      },
    ],
    [t],
  );

  const visibleStops = useMemo(
    () => (conflict === 'all' ? stops : stops.filter((stop) => stop.conflict === conflict)),
    [conflict, stops],
  );
  const payload = useMemo(
    () => buildMilitaryPayload(visibleStops, personId, personLabel, conflictOptions),
    [conflictOptions, personId, personLabel, visibleStops],
  );
  const activeConflicts = new Set(visibleStops.map((stop) => stop.conflict));

  async function handleSaveConflict() {
    if (!session?.accessToken || !canPropose) return;
    const name = newConflictName.trim().replace(/\s+/g, ' ');
    if (!CONFLICT_NAME_PATTERN.test(name)) {
      setError(t('conflictNameInvalid'));
      return;
    }
    setSavingConflict(true);
    setError('');
    try {
      const created = await apiClient.militaryHistory.proposeConflict({ name }, session.accessToken);
      setMyProposals((prev) => [created, ...prev]);
      setProposalModalName(name);
      setNewConflictName('');
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setSavingConflict(false);
    }
  }

  async function handleApproveConflict(id: string) {
    if (!session?.accessToken || !isModerator) return;
    const name = (reviewEdits[id] ?? '').trim().replace(/\s+/g, ' ');
    if (!CONFLICT_NAME_PATTERN.test(name)) {
      setError(t('conflictNameInvalid'));
      return;
    }
    setError('');
    try {
      const approved = await apiClient.militaryHistory.approveConflict(id, { name }, session.accessToken);
      setPendingConflicts((prev) => prev.filter((item) => item.id !== id));
      setCustomConflicts((prev) => [...prev, { id: approved.id, name: approved.name, color: approved.color }]);
      setNotice(t('conflictApprovedDirect'));
      await loadCustomConflicts();
    } catch (err) {
      setError(formatApiError(err));
    }
  }

  async function handleRejectConflict(id: string) {
    if (!session?.accessToken || !isModerator) return;
    setError('');
    try {
      await apiClient.militaryHistory.rejectConflict(id, session.accessToken);
      setPendingConflicts((prev) => prev.filter((item) => item.id !== id));
      setNotice(t('conflictRejected'));
      await loadCustomConflicts();
    } catch (err) {
      setError(formatApiError(err));
    }
  }

  async function handleDeleteConflict(id: string) {
    if (!session?.accessToken || !isModerator) return;
    setError('');
    try {
      await apiClient.militaryHistory.deleteConflict(id, session.accessToken);
      setCustomConflicts((prev) => prev.filter((item) => item.id !== id));
      if (conflict === id) setConflict('all');
      setNotice(t('conflictDeleted'));
    } catch (err) {
      setError(formatApiError(err));
    }
  }

  async function handleCancelProposal(id: string) {
    if (!session?.accessToken) return;
    setError('');
    try {
      await apiClient.militaryHistory.cancelProposal(id, session.accessToken);
      setMyProposals((prev) => prev.filter((item) => item.id !== id));
      setNotice(t('cancelProposal'));
    } catch (err) {
      setError(formatApiError(err));
    }
  }

  return (
    <div className="space-y-6">
      <PageHero
        eyebrow={t('eyebrow')}
        title={t('title')}
        description={t('description')}
        action={
          <div className="flex flex-wrap gap-2">
            <Link href="/archives/search">
              <Button variant="secondary">{t('openArchives')}</Button>
            </Link>
            <Link href={personId !== 'demo-veteran' ? `/timeline?personId=${personId}` : '/timeline'}>
              <Button variant="secondary">{t('openTimeline')}</Button>
            </Link>
          </div>
        }
      />

      {error ? <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}
      {notice ? (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{notice}</p>
      ) : null}

      <Card className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
        <FormField label={t('person')}>
          <Select value={personId} onChange={(event) => setPersonId(event.target.value)}>
            {persons.length === 0 ? <option value="demo-veteran">{t('demoPerson')}</option> : null}
            {persons.map((person) => (
              <option key={person.id} value={person.id}>
                {formatPersonLabel(person)}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label={t('conflict')}>
          <Select value={conflict} onChange={(event) => setConflict(event.target.value as ConflictKey | 'all')}>
            <option value="all">{t('allConflicts')}</option>
            {conflictOptions.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </Select>
        </FormField>
        <div className="flex flex-wrap items-end gap-2">
          {conflictOptions.map((item) => (
            <Badge key={item.id} tone={activeConflicts.has(item.id) ? 'gold' : 'muted'}>
              {item.label}
            </Badge>
          ))}
        </div>
      </Card>

      {isModerator && pendingConflicts.length > 0 ? (
        <Card className="space-y-4 border-amber-200/80 p-4 dark:border-amber-900/40">
          <div>
            <p className="font-serif text-lg font-semibold text-family-ink dark:text-white">{t('pendingReviewTitle')}</p>
            <p className="mt-1 text-sm text-stone-500 dark:text-slate-400">{t('pendingReviewHint')}</p>
          </div>
          <ul className="space-y-3">
            {pendingConflicts.map((item) => (
              <li
                key={item.id}
                className={`rounded-2xl border p-4 ${
                  reviewFocusId === item.id
                    ? 'border-family-accent bg-amber-50/80 dark:bg-amber-950/20'
                    : 'border-stone-200/70 dark:border-slate-700'
                }`}
              >
                {item.proposerLabel ? (
                  <p className="mb-2 text-xs text-stone-500">{t('proposedBy', { name: item.proposerLabel })}</p>
                ) : null}
                <Input
                  value={reviewEdits[item.id] ?? item.name}
                  maxLength={120}
                  aria-label={t('newConflictName')}
                  onChange={(event) =>
                    setReviewEdits((prev) => ({
                      ...prev,
                      [item.id]: event.target.value,
                    }))
                  }
                />
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button onClick={() => void handleApproveConflict(item.id)}>{t('editAndApprove')}</Button>
                  <Button variant="secondary" onClick={() => void handleRejectConflict(item.id)}>
                    {t('rejectConflict')}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <Card className="space-y-4 p-4">
        <div>
          <p className="font-serif text-lg font-semibold text-family-ink dark:text-white">{t('customConflicts')}</p>
          <p className="mt-1 text-sm text-stone-500 dark:text-slate-400">{t('customConflictsHint')}</p>
          <p className="mt-1 text-xs text-stone-400">{t('notificationHint')}</p>
        </div>
        {canPropose ? (
          <div className="flex flex-col gap-3 sm:flex-row">
            <Input
              value={newConflictName}
              maxLength={120}
              placeholder={t('newConflictPlaceholder')}
              aria-label={t('newConflictName')}
              onChange={(event) => setNewConflictName(event.target.value)}
            />
            <Button disabled={savingConflict || newConflictName.trim().length < 2} onClick={() => void handleSaveConflict()}>
              {savingConflict ? t('saveConflict') + '…' : t('saveConflict')}
            </Button>
          </div>
        ) : null}
        {customConflicts.length > 0 ? (
          <ul className="space-y-2">
            {customConflicts.map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between gap-3 rounded-2xl border border-stone-200/70 px-3 py-2 dark:border-slate-700"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{item.name}</span>
                  <Badge tone="green">{t('statusApproved')}</Badge>
                </div>
                {isModerator ? (
                  <Button variant="ghost" onClick={() => void handleDeleteConflict(item.id)}>
                    {t('deleteConflict')}
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}
        {myProposals.length > 0 ? (
          <div className="space-y-2 border-t border-stone-200/70 pt-4 dark:border-slate-700">
            <p className="text-sm font-semibold">{t('myProposalsTitle')}</p>
            <p className="text-xs text-stone-500">{t('myProposalsHint')}</p>
            <ul className="space-y-2">
              {myProposals.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-dashed border-stone-300 px-3 py-2 dark:border-slate-600"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{item.name}</span>
                    <Badge tone="gold">{t('statusPending')}</Badge>
                  </div>
                  <Button variant="ghost" onClick={() => void handleCancelProposal(item.id)}>
                    {t('cancelProposal')}
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-5">
          <p className="text-sm text-stone-500 dark:text-slate-400">{t('stats.routes')}</p>
          <p className="mt-2 text-3xl font-semibold text-family-primary dark:text-family-accent">{payload.routes.length}</p>
          <p className="mt-2 text-xs text-stone-500 dark:text-slate-400">{t('stats.routesHint')}</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-stone-500 dark:text-slate-400">{t('stats.places')}</p>
          <p className="mt-2 text-3xl font-semibold text-family-primary dark:text-family-accent">{payload.places.length}</p>
          <p className="mt-2 text-xs text-stone-500 dark:text-slate-400">{t('stats.placesHint')}</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-stone-500 dark:text-slate-400">{t('stats.awards')}</p>
          <p className="mt-2 text-3xl font-semibold text-family-primary dark:text-family-accent">4</p>
          <p className="mt-2 text-xs text-stone-500 dark:text-slate-400">{t('stats.awardsHint')}</p>
        </Card>
      </div>

      <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(320px,380px)]">
        <Card className="min-w-0 p-4">
          <div className="mb-4">
            <p className="font-serif text-xl font-semibold text-family-ink dark:text-white">{t('mapTitle')}</p>
            <p className="mt-1 text-sm text-stone-500 dark:text-slate-400">{t('mapDescription')}</p>
          </div>
          <HistoricalMapCanvas payload={payload} />
        </Card>

        <div className="space-y-4">
          <Card className="p-5">
            <p className="font-serif text-lg font-semibold text-family-ink dark:text-white">{t('serviceTitle')}</p>
            <ol className="mt-4 space-y-3">
              {visibleStops.map((stop) => (
                <li key={stop.id} className="rounded-2xl border border-stone-200/70 bg-white/70 p-3 dark:border-slate-700 dark:bg-slate-950/50">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold">{stop.title}</p>
                      <p className="mt-1 text-xs text-stone-500">
                        {stop.place} · {stop.year} · {getConflictLabel(stop.conflict)}
                      </p>
                    </div>
                    <Badge tone="gold">{stop.order}</Badge>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-stone-600 dark:text-slate-300">{stop.description}</p>
                </li>
              ))}
            </ol>
          </Card>

          <Card className="p-5">
            <p className="font-serif text-lg font-semibold text-family-ink dark:text-white">{t('awardsTitle')}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Badge tone="gold">{t('awards.medalCourage')}</Badge>
              <Badge tone="gold">{t('awards.orderGlory')}</Badge>
              <Badge tone="green">{t('awards.victoryMedal')}</Badge>
              <Badge tone="blue">{t('awards.archiveConfirmed')}</Badge>
            </div>
          </Card>

          <Card className="p-5">
            <p className="font-serif text-lg font-semibold text-family-ink dark:text-white">{t('memoriesTitle')}</p>
            <blockquote className="mt-3 border-l-4 border-family-accent pl-4 text-sm leading-6 text-stone-600 dark:text-slate-300">
              {t('memoryQuote')}
            </blockquote>
          </Card>

          <Card className="p-5">
            <p className="font-serif text-lg font-semibold text-family-ink dark:text-white">{t('archivesTitle')}</p>
            <div className="mt-4 space-y-3 text-sm text-stone-600 dark:text-slate-300">
              <p>{t('archives.registry')}</p>
              <p>{t('archives.awards')}</p>
              <p>{t('archives.memoirs')}</p>
            </div>
          </Card>
        </div>
      </div>

      {proposalModalName ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 p-4"
          role="presentation"
          onClick={() => setProposalModalName(null)}
        >
          <div className="w-full max-w-md" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true">
            <Card className="text-center shadow-2xl">
              <p className="font-serif text-xl font-semibold text-family-ink dark:text-white">{t('proposalModalTitle')}</p>
              <p className="mt-4 text-sm leading-6 text-stone-600 dark:text-slate-300">
                {t('proposalModalBody', { name: proposalModalName })}
              </p>
              <p className="mt-3 text-xs leading-5 text-stone-500 dark:text-slate-400">{t('proposalModalHint')}</p>
              <Button className="mt-6 w-full" onClick={() => setProposalModalName(null)}>
                {t('proposalModalOk')}
              </Button>
            </Card>
          </div>
        </div>
      ) : null}
    </div>
  );
}
