'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { CalendarEventKind, CalendarEventSummary } from '@family/shared';
import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui';
import { cn } from '@/lib/utils';

type ViewMode = 'month' | 'week';

const WEEKDAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;

const KIND_COLORS: Record<CalendarEventKind, string> = {
  BIRTH: 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200',
  DEATH: 'bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-200',
  MARRIAGE: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200',
  ANNIVERSARY: 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200',
  CUSTOM: 'bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-200',
  REMINDER: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200',
};

function startOfDay(d: Date) {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function addDays(d: Date, days: number) {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function isoDateKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

function eventsForDay(events: CalendarEventSummary[], day: Date) {
  const key = isoDateKey(day);
  return events.filter((ev) => ev.date.slice(0, 10) === key);
}

function buildMonthGrid(anchor: Date) {
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const last = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);
  const mondayOffset = (first.getDay() + 6) % 7;
  const gridStart = addDays(first, -mondayOffset);
  const cells: Date[] = [];
  let cursor = gridStart;
  while (cells.length < 42) {
    cells.push(new Date(cursor));
    cursor = addDays(cursor, 1);
    if (cells.length >= 35 && cursor > last && cursor.getDay() === 1) break;
  }
  while (cells.length < 42) {
    cells.push(new Date(cursor));
    cursor = addDays(cursor, 1);
  }
  return cells;
}

function buildWeekDays(anchor: Date) {
  const mondayOffset = (anchor.getDay() + 6) % 7;
  const weekStart = addDays(anchor, -mondayOffset);
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
}

type CalendarGridProps = {
  events: CalendarEventSummary[];
  loading?: boolean;
};

export function CalendarGrid({ events, loading }: CalendarGridProps) {
  const t = useTranslations('calendar');
  const [view, setView] = useState<ViewMode>('month');
  const [anchor, setAnchor] = useState(() => startOfDay(new Date()));
  const [selectedDay, setSelectedDay] = useState(() => startOfDay(new Date()));
  const today = useMemo(() => startOfDay(new Date()), []);

  const monthCells = useMemo(() => buildMonthGrid(anchor), [anchor]);
  const weekDays = useMemo(() => buildWeekDays(anchor), [anchor]);

  const monthLabel = anchor.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  const weekStart = weekDays[0];
  const weekEnd = weekDays[6];
  const weekLabel = `${weekStart.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })} – ${weekEnd.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}`;

  function shiftPeriod(delta: number) {
    if (view === 'month') {
      setAnchor((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
    } else {
      setAnchor((prev) => addDays(prev, delta * 7));
    }
  }

  const selectedEvents = eventsForDay(events, selectedDay);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="secondary" className="px-2 py-1" onClick={() => shiftPeriod(-1)} aria-label={t('prev')}>
            ‹
          </Button>
          <h2 className="min-w-[12rem] text-center font-serif text-lg font-semibold">
            {view === 'month' ? monthLabel : weekLabel}
          </h2>
          <Button variant="secondary" className="px-2 py-1" onClick={() => shiftPeriod(1)} aria-label={t('next')}>
            ›
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            className="px-3 py-1.5 text-xs"
            onClick={() => {
              const now = startOfDay(new Date());
              setAnchor(now);
              setSelectedDay(now);
            }}
          >
            {t('today')}
          </Button>
          <div className="inline-flex rounded-xl border dark:border-slate-800">
            <button
              type="button"
              className={cn(
                'rounded-l-xl px-3 py-1.5 text-sm',
                view === 'month' ? 'bg-family-primary text-white' : 'text-stone-600 dark:text-slate-300',
              )}
              onClick={() => setView('month')}
            >
              {t('viewMonth')}
            </button>
            <button
              type="button"
              className={cn(
                'rounded-r-xl px-3 py-1.5 text-sm',
                view === 'week' ? 'bg-family-primary text-white' : 'text-stone-600 dark:text-slate-300',
              )}
              onClick={() => setView('week')}
            >
              {t('viewWeek')}
            </button>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border bg-white/80 dark:border-slate-800 dark:bg-slate-950/60">
        <div className="grid grid-cols-7 border-b bg-stone-50/80 text-center text-xs font-medium uppercase tracking-wide text-stone-500 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400">
          {WEEKDAY_KEYS.map((key) => (
            <div key={key} className="px-2 py-2">
              {t(`weekdays.${key}`)}
            </div>
          ))}
        </div>

        {loading ? (
          <p className="p-4 text-sm text-stone-500">{t('loading')}</p>
        ) : view === 'month' ? (
          <div className="grid grid-cols-7">
            {monthCells.map((day) => {
              const dayEvents = eventsForDay(events, day);
              const inMonth = day.getMonth() === anchor.getMonth();
              const isSelected = sameDay(day, selectedDay);
              const isToday = sameDay(day, today);
              return (
                <button
                  key={isoDateKey(day)}
                  type="button"
                  onClick={() => setSelectedDay(day)}
                  className={cn(
                    'min-h-[5.5rem] border-b border-r p-2 text-left transition dark:border-slate-800',
                    !inMonth && 'bg-stone-50/50 text-stone-400 dark:bg-slate-900/30 dark:text-slate-500',
                    isSelected && 'ring-2 ring-inset ring-family-primary/60',
                    isToday && 'bg-family-accent/10',
                  )}
                >
                  <span
                    className={cn(
                      'inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium',
                      isToday && 'bg-family-primary text-white',
                    )}
                  >
                    {day.getDate()}
                  </span>
                  <div className="mt-1 space-y-0.5">
                    {dayEvents.slice(0, 2).map((ev) => (
                      <p
                        key={ev.id}
                        className={cn('truncate rounded px-1 py-0.5 text-[10px] leading-tight', KIND_COLORS[ev.kind])}
                        title={ev.title}
                      >
                        {ev.title}
                      </p>
                    ))}
                    {dayEvents.length > 2 ? (
                      <p className="text-[10px] text-stone-500">{t('moreEvents', { count: dayEvents.length - 2 })}</p>
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="grid grid-cols-7 divide-x dark:divide-slate-800">
            {weekDays.map((day) => {
              const dayEvents = eventsForDay(events, day);
              const isSelected = sameDay(day, selectedDay);
              const isToday = sameDay(day, today);
              return (
                <button
                  key={isoDateKey(day)}
                  type="button"
                  onClick={() => setSelectedDay(day)}
                  className={cn(
                    'min-h-[12rem] p-2 text-left',
                    isSelected && 'bg-family-accent/10 ring-2 ring-inset ring-family-primary/40',
                    isToday && !isSelected && 'bg-stone-50/80 dark:bg-slate-900/40',
                  )}
                >
                  <span
                    className={cn(
                      'inline-flex h-7 w-7 items-center justify-center rounded-full text-sm font-medium',
                      isToday && 'bg-family-primary text-white',
                    )}
                  >
                    {day.getDate()}
                  </span>
                  <div className="mt-2 space-y-1">
                    {dayEvents.map((ev) => (
                      <EventChip key={ev.id} event={ev} compact />
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="rounded-2xl border bg-white/80 p-4 dark:border-slate-800 dark:bg-slate-950/60">
        <h3 className="font-medium">
          {selectedDay.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </h3>
        {selectedEvents.length === 0 ? (
          <p className="mt-2 text-sm text-stone-500">{t('noEventsDay')}</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {selectedEvents.map((ev) => (
              <li key={ev.id}>
                <EventChip event={ev} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function EventChip({ event, compact }: { event: CalendarEventSummary; compact?: boolean }) {
  const t = useTranslations('calendar');
  const content = (
    <div
      className={cn(
        'flex items-start gap-2 rounded-lg px-2 py-1.5 text-left',
        KIND_COLORS[event.kind],
        !compact && 'w-full',
      )}
    >
      <div className="min-w-0 flex-1">
        <p className={cn('font-medium', compact ? 'text-[10px] leading-tight' : 'text-sm')}>{event.title}</p>
        {!compact ? <p className="text-xs opacity-80">{event.kind}</p> : null}
      </div>
      {event.deepLink && !compact ? (
        <span className="shrink-0 text-xs underline">{t('open')}</span>
      ) : null}
    </div>
  );

  if (event.deepLink) {
    return (
      <Link href={event.deepLink} className="block hover:opacity-90">
        {content}
      </Link>
    );
  }
  return content;
}
