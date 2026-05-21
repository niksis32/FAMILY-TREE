'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/components/auth-provider';
import { Badge, Button, Card, EmptyState, FormField, Select } from '@/components/ui';
import { apiClient, formatApiError, type PersonTimelineResponse, type TimelineEntry, type TimelineEventType } from '@/lib/api-client';
import { sortTimelineFilterTypes } from '@/lib/event-type-labels';
import { formatPersonLabel } from '@/lib/person-display';
import type { PersonSummary } from '@family/shared';

const labels: Record<TimelineEventType, string> = {
  birth: 'Рождение',
  death: 'Смерть',
  marriage: 'Брак',
  migration: 'Миграция',
  education: 'Образование',
  military: 'Военная служба',
  work: 'Работа',
  custom: 'Другое',
};

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
  const [persons, setPersons] = useState<PersonSummary[]>([]);
  const [personId, setPersonId] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<Set<TimelineEventType>>(new Set());
  const [timeline, setTimeline] = useState<PersonTimelineResponse>(emptyTimeline);
  const [status, setStatus] = useState('Выберите персону для загрузки хронологии.');

  useEffect(() => {
    async function loadPersons() {
      try {
        const list = await apiClient.persons.list(session?.accessToken);
        setPersons(list);
        if (list.length > 0 && !personId) {
          setPersonId(list[0].id);
        }
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
        setStatus('Выберите персону.');
        return;
      }
      setStatus('Загружаем хронологию жизни...');

      try {
        const data = await apiClient.timeline.person(personId.trim(), session?.accessToken);
        if (cancelled) return;
        setTimeline(data);
        setSelectedTypes(new Set());
        setStatus(`Событий: ${data.events.length}`);
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
  }, [personId, session?.accessToken]);

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
            <p className="text-sm text-stone-500 dark:text-slate-400">Хронология жизни</p>
            <p className="font-semibold text-family-primary dark:text-family-accent">
              {timeline.personName || 'Персона не выбрана'}
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <FormField label="Персона" className="sm:w-72">
              <Select
                value={personId}
                onChange={(event) => setPersonId(event.target.value)}
                disabled={persons.length === 0}
              >
                <option value="">Не выбрано</option>
                {persons.map((person) => (
                  <option key={person.id} value={person.id}>
                    {formatPersonLabel(person)}
                  </option>
                ))}
              </Select>
            </FormField>
            <Button type="button" variant="secondary" onClick={() => setSelectedTypes(new Set())}>
              Сбросить фильтр
            </Button>
          </div>
        </div>
        <p className="mt-3 text-sm text-stone-500 dark:text-slate-400">{status}</p>
      </Card>

      {persons.length === 0 ? (
        <EmptyState title="Персон нет" description="Сначала создайте персону на странице «Люди»." />
      ) : null}

      {timeline.availableTypes.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {sortTimelineFilterTypes(timeline.availableTypes).map((type) => (
            <Button
              key={type}
              type="button"
              variant={selectedTypes.has(type) ? 'primary' : 'secondary'}
              onClick={() => toggleType(type)}
            >
              {labels[type]}
            </Button>
          ))}
        </div>
      ) : null}

      {visibleEvents.length === 0 && personId ? (
        <EmptyState title="Событий пока нет" description="Добавьте события в блоке администрирования ниже или через API." />
      ) : null}

      <div className="relative space-y-5 before:absolute before:left-5 before:top-3 before:h-[calc(100%-24px)] before:w-px before:bg-family-accent/40">
        {visibleEvents.map((event) => (
          <TimelineCard key={event.id} event={event} />
        ))}
      </div>
    </div>
  );
}

function TimelineCard({ event }: { event: TimelineEntry }) {
  const typeBadgeTone = event.type === 'death' ? 'muted' : 'blue';

  return (
    <div className="relative pl-14">
      <div className="absolute left-2 top-2 h-6 w-6 rounded-full border-4 border-white bg-family-accent shadow dark:border-slate-950" />
      <Card className="p-5">
        <div className="flex flex-wrap items-center gap-3">
          <Badge tone="gold">{formatDateRange(event.dateFrom, event.dateTo)}</Badge>
          <Badge tone={typeBadgeTone}>{labels[event.type]}</Badge>
          {event.place ? <Badge>{event.place}</Badge> : null}
        </div>
        <h3 className="mt-4 text-lg font-semibold">{event.title}</h3>
        {event.description ? <p className="mt-2 text-sm leading-6 text-stone-600 dark:text-slate-300">{event.description}</p> : null}

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <RelatedAssets title="Документы" href="/documents" items={event.relatedDocuments} />
          <RelatedAssets title="Медиа" href="/media" items={event.relatedMedia} />
        </div>

        <p className="mt-5 rounded-2xl border bg-stone-50 p-3 text-xs text-stone-500 dark:bg-slate-950 dark:text-slate-400">
          ИИ выполнило краткое изложение: {formatAiSummaryText(event.aiSummaryInput.text).slice(0, 160)}
        </p>
      </Card>
    </div>
  );
}

function RelatedAssets({ title, href, items }: { title: string; href: string; items: TimelineEntry['relatedDocuments'] }) {
  return (
    <div className="rounded-2xl border bg-stone-50 p-4 dark:bg-slate-950">
      <div className="flex items-center justify-between gap-3">
        <p className="font-semibold">{title}</p>
        <Link className="text-sm text-family-primary hover:underline dark:text-family-accent" href={href}>
          открыть
        </Link>
      </div>
      <div className="mt-3 space-y-2">
        {items.length === 0 ? <p className="text-sm text-stone-500 dark:text-slate-400">Нет связей</p> : null}
        {items.slice(0, 3).map((item) => (
          <p key={item.id} className="truncate text-sm text-stone-600 dark:text-slate-300">
            {item.title}
          </p>
        ))}
      </div>
    </div>
  );
}

function formatDateRange(dateFrom?: string | null, dateTo?: string | null) {
  const from = formatDate(dateFrom);
  const to = formatDate(dateTo);
  return to ? `${from} - ${to}` : from;
}

function formatDate(value?: string | null) {
  if (!value) return 'без даты';
  return new Intl.DateTimeFormat('ru-RU', { year: 'numeric', month: 'short', day: '2-digit' }).format(new Date(value));
}

function formatAiSummaryText(text: string) {
  return text.replace(/(\d{4}-\d{2}-\d{2})T[\d:.]+Z?/gi, '$1');
}
