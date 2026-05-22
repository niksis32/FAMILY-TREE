'use client';

import { Link } from '@/i18n/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/components/auth-provider';
import { intlLocale } from '@/i18n/config';
import { Badge, Button, Card, EmptyState, FormField, Select } from '@/components/ui';
import { apiClient, type PersonTimelineResponse, type TimelineEntry, type TimelineEventType } from '@/lib/api-client';
import { sortTimelineFilterTypes } from '@/lib/event-type-labels';
import { useTimelineEventTypeLabel } from '@/lib/use-event-type-labels';
import { useFormatApiError } from '@/lib/use-format-api-error';
import { formatPersonLabel } from '@/lib/person-display';
import type { AppLocale, PersonSummary } from '@family/shared';

const emptyTimeline: PersonTimelineResponse = {
  personId: '',
  personName: '',
  availableTypes: [],
  events: [],
};

type TimelineViewProps = {
  onActivePersonChange?: (personId: string) => void;
};

export function TimelineView({ onActivePersonChange }: TimelineViewProps) {
  const { session } = useAuth();
  const locale = useLocale() as AppLocale;
  const t = useTranslations('timelineView');
  const tCommon = useTranslations('common');
  const formatApiError = useFormatApiError();
  const timelineEventLabel = useTimelineEventTypeLabel();
  const [persons, setPersons] = useState<PersonSummary[]>([]);
  const [personId, setPersonId] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<Set<TimelineEventType>>(new Set());
  const [timeline, setTimeline] = useState<PersonTimelineResponse>(emptyTimeline);
  const [status, setStatus] = useState('');

  useEffect(() => {
    setStatus(t('selectPersonPrompt'));
  }, [t]);

  useEffect(() => {
    async function loadPersons() {
      try {
        const list = await apiClient.persons.list(session?.accessToken);
        setPersons(list);
      } catch (error) {
        setStatus(formatApiError(error));
      }
    }
    void loadPersons();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.accessToken]);

  useEffect(() => {
    let cancelled = false;

    async function loadTimeline() {
      if (!personId.trim()) {
        setTimeline(emptyTimeline);
        setStatus(t('selectPersonShort'));
        return;
      }
      setStatus(t('loadingTimeline'));

      try {
        const data = await apiClient.timeline.person(personId.trim(), session?.accessToken);
        if (cancelled) return;
        setTimeline(data);
        setSelectedTypes(new Set());
        setStatus(t('eventsCount', { count: data.events.length }));
      } catch (error) {
        if (cancelled) return;
        setTimeline(emptyTimeline);
        setStatus(formatApiError(error));
      }
    }

    void loadTimeline();

    return () => {
      cancelled = true;
    };
  }, [personId, session?.accessToken, t, formatApiError]);

  useEffect(() => {
    onActivePersonChange?.(personId);
  }, [personId, onActivePersonChange]);

  const visibleEvents = useMemo(() => {
    if (selectedTypes.size === 0) return timeline.events;
    return timeline.events.filter((event) => selectedTypes.has(event.type));
  }, [selectedTypes, timeline.events]);

  function toggleType(type: TimelineEventType) {
    setSelectedTypes((current) => {
      const next = new Set(current);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  }

  return (
    <div className="space-y-6">
      <Card className="p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm text-stone-500 dark:text-slate-400">{t('subtitle')}</p>
            <p className="font-semibold text-family-primary dark:text-family-accent">
              {timeline.personName || t('personNotSelected')}
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <FormField label={t('person')} className="sm:w-72">
              <Select
                value={personId}
                onChange={(event) => setPersonId(event.target.value)}
                disabled={persons.length === 0}
              >
                <option value="">{tCommon('notSelected')}</option>
                {persons.map((person) => (
                  <option key={person.id} value={person.id}>
                    {formatPersonLabel(person)}
                  </option>
                ))}
              </Select>
            </FormField>
            <Button type="button" variant="secondary" onClick={() => setSelectedTypes(new Set())}>
              {t('resetFilter')}
            </Button>
          </div>
        </div>
        <p className="mt-3 text-sm text-stone-500 dark:text-slate-400">{status}</p>
      </Card>

      {persons.length === 0 ? <EmptyState title={t('noPersonsTitle')} description={t('noPersonsDesc')} /> : null}

      {timeline.availableTypes.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {sortTimelineFilterTypes(timeline.availableTypes).map((type) => (
            <Button
              key={type}
              type="button"
              variant={selectedTypes.has(type) ? 'primary' : 'secondary'}
              onClick={() => toggleType(type)}
            >
              {timelineEventLabel(type)}
            </Button>
          ))}
        </div>
      ) : null}

      {visibleEvents.length === 0 && personId ? (
        <EmptyState title={t('noEventsTitle')} description={t('noEventsDesc')} />
      ) : null}

      <div className="relative space-y-5 before:absolute before:left-5 before:top-3 before:h-[calc(100%-24px)] before:w-px before:bg-family-accent/40">
        {visibleEvents.map((event) => (
          <TimelineCard key={event.id} event={event} locale={locale} />
        ))}
      </div>
    </div>
  );
}

function TimelineCard({ event, locale }: { event: TimelineEntry; locale: AppLocale }) {
  const t = useTranslations('timelineView');
  const tCommon = useTranslations('common');
  const timelineEventLabel = useTimelineEventTypeLabel();
  const typeBadgeTone = event.type === 'death' ? 'muted' : 'blue';

  return (
    <div className="relative pl-14">
      <div className="absolute left-2 top-2 h-6 w-6 rounded-full border-4 border-white bg-family-accent shadow dark:border-slate-950" />
      <Card className="p-5">
        <div className="flex flex-wrap items-center gap-3">
          <Badge tone="gold">{formatDateRange(event.dateFrom, event.dateTo, locale, tCommon)}</Badge>
          <Badge tone={typeBadgeTone}>{timelineEventLabel(event.type)}</Badge>
          {event.place ? <Badge>{event.place}</Badge> : null}
        </div>
        <h3 className="mt-4 text-lg font-semibold">{event.title}</h3>
        {event.description ? <p className="mt-2 text-sm leading-6 text-stone-600 dark:text-slate-300">{event.description}</p> : null}

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <RelatedAssets title={t('documents')} href="/documents" items={event.relatedDocuments} />
          <RelatedAssets title={t('media')} href="/media" items={event.relatedMedia} />
        </div>

        <p className="mt-5 rounded-2xl border bg-stone-50 p-3 text-xs text-stone-500 dark:bg-slate-950 dark:text-slate-400">
          {t('aiSummaryPrefix')} {formatAiSummaryText(event.aiSummaryInput.text).slice(0, 160)}
        </p>
      </Card>
    </div>
  );
}

function RelatedAssets({
  title,
  href,
  items,
}: {
  title: string;
  href: string;
  items: TimelineEntry['relatedDocuments'];
}) {
  const t = useTranslations('timelineView');
  const tCommon = useTranslations('common');

  return (
    <div className="rounded-2xl border bg-stone-50 p-4 dark:bg-slate-950">
      <div className="flex items-center justify-between gap-3">
        <p className="font-semibold">{title}</p>
        <Link className="text-sm text-family-primary hover:underline dark:text-family-accent" href={href}>
          {tCommon('open')}
        </Link>
      </div>
      <div className="mt-3 space-y-2">
        {items.length === 0 ? <p className="text-sm text-stone-500 dark:text-slate-400">{tCommon('noLinks')}</p> : null}
        {items.slice(0, 3).map((item) => (
          <p key={item.id} className="truncate text-sm text-stone-600 dark:text-slate-300">
            {item.title}
          </p>
        ))}
      </div>
    </div>
  );
}

function formatDateRange(
  dateFrom: string | null | undefined,
  dateTo: string | null | undefined,
  locale: AppLocale,
  t: (key: 'noDate') => string,
) {
  const from = formatDate(dateFrom, locale, t('noDate'));
  const to = formatDate(dateTo, locale, t('noDate'));
  return to && dateTo ? `${from} - ${to}` : from;
}

function formatDate(value: string | null | undefined, locale: AppLocale, noDateLabel: string) {
  if (!value) return noDateLabel;
  return new Intl.DateTimeFormat(intlLocale(locale), {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  }).format(new Date(value));
}

function formatAiSummaryText(text: string) {
  return text.replace(/(\d{4}-\d{2}-\d{2})T[\d:.]+Z?/gi, '$1');
}
