'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/components/auth-provider';
import { Badge, Button, Card, Input } from '@/components/ui';
import { apiClient, type PersonTimelineResponse, type TimelineEntry, type TimelineEventType } from '@/lib/api-client';

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

const fallbackTimeline: PersonTimelineResponse = {
  personId: 'p3',
  personName: 'Елена Орлова',
  availableTypes: ['birth', 'marriage', 'migration', 'education', 'military', 'work', 'custom'],
  events: [
    {
      id: 'demo-birth',
      type: 'birth',
      title: 'Рождение',
      description: 'Первая запись в timeline человека.',
      dateFrom: '1984-02-20T00:00:00.000Z',
      dateTo: null,
      sortDate: '1984-02-20T00:00:00.000Z',
      place: 'Казань',
      relatedDocuments: [{ id: 'd1', title: 'Свидетельство о рождении', type: 'document', mimeType: 'application/pdf' }],
      relatedMedia: [],
      aiSummaryInput: { personId: 'p3', eventType: 'birth', text: 'Рождение\nКазань\n1984' },
    },
    {
      id: 'demo-migration',
      type: 'migration',
      title: 'Переезд семьи',
      description: 'Смена города и новая ветка семейной истории.',
      dateFrom: '2002-01-01T00:00:00.000Z',
      dateTo: '2003-01-01T00:00:00.000Z',
      sortDate: '2002-01-01T00:00:00.000Z',
      place: 'Москва',
      relatedDocuments: [],
      relatedMedia: [{ id: 'm1', title: 'Семейный альбом 2000-х', type: 'media', mimeType: 'image/jpeg' }],
      aiSummaryInput: { personId: 'p3', eventType: 'migration', text: 'Переезд семьи\nМосква\n2002' },
    },
  ],
};

export function TimelineView() {
  const { session } = useAuth();
  const [personId, setPersonId] = useState('p3');
  const [selectedTypes, setSelectedTypes] = useState<Set<TimelineEventType>>(new Set());
  const [timeline, setTimeline] = useState<PersonTimelineResponse>(fallbackTimeline);
  const [status, setStatus] = useState('Demo timeline loaded. Укажите реальный Person ID для данных из API.');

  useEffect(() => {
    let cancelled = false;

    async function loadTimeline() {
      if (!personId.trim()) return;
      setStatus('Загружаем timeline из backend...');

      try {
        const data = await apiClient.timeline.person(personId.trim(), session?.accessToken);
        if (cancelled) return;
        setTimeline(data);
        setSelectedTypes(new Set());
        setStatus(`Загружено событий: ${data.events.length}`);
      } catch (error) {
        if (cancelled) return;
        setTimeline(fallbackTimeline);
        setStatus(error instanceof Error ? `API недоступен, показан demo timeline: ${error.message}` : 'API недоступен, показан demo timeline');
      }
    }

    void loadTimeline();

    return () => {
      cancelled = true;
    };
  }, [personId, session?.accessToken]);

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
            <p className="text-sm text-stone-500 dark:text-slate-400">Timeline person</p>
            <p className="font-semibold text-family-primary dark:text-family-accent">{timeline.personName}</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input className="sm:w-72" value={personId} onChange={(event) => setPersonId(event.target.value)} placeholder="Person ID" />
            <Button type="button" variant="secondary" onClick={() => setSelectedTypes(new Set())}>
              Сбросить фильтр
            </Button>
          </div>
        </div>
        <p className="mt-3 text-sm text-stone-500 dark:text-slate-400">{status}</p>
      </Card>

      <div className="flex flex-wrap gap-2">
        {timeline.availableTypes.map((type) => (
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

      <div className="relative space-y-5 before:absolute before:left-5 before:top-3 before:h-[calc(100%-24px)] before:w-px before:bg-family-accent/40">
        {visibleEvents.map((event) => (
          <TimelineCard key={event.id} event={event} />
        ))}
      </div>
    </div>
  );
}

function TimelineCard({ event }: { event: TimelineEntry }) {
  return (
    <div className="relative pl-14">
      <div className="absolute left-2 top-2 h-6 w-6 rounded-full border-4 border-white bg-family-accent shadow dark:border-slate-950" />
      <Card className="p-5">
        <div className="flex flex-wrap items-center gap-3">
          <Badge tone="gold">{formatDateRange(event.dateFrom, event.dateTo)}</Badge>
          <Badge tone="blue">{labels[event.type]}</Badge>
          {event.place ? <Badge>{event.place}</Badge> : null}
        </div>
        <h3 className="mt-4 text-lg font-semibold">{event.title}</h3>
        {event.description ? <p className="mt-2 text-sm leading-6 text-stone-600 dark:text-slate-300">{event.description}</p> : null}

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <RelatedAssets title="Документы" href="/documents" items={event.relatedDocuments} />
          <RelatedAssets title="Медиа" href="/media" items={event.relatedMedia} />
        </div>

        <p className="mt-5 rounded-2xl border bg-stone-50 p-3 text-xs text-stone-500 dark:bg-slate-950 dark:text-slate-400">
          AI summary ready: {event.aiSummaryInput.text.slice(0, 120)}
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
