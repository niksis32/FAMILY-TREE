'use client';

import { useHistoricalMapStore } from './use-historical-map-store';

interface MapTimelineSliderProps {
  minYear: number;
  maxYear: number;
  timelineHref?: string;
}

export function MapTimelineSlider({ minYear, maxYear, timelineHref }: MapTimelineSliderProps) {
  const yearFrom = useHistoricalMapStore((s) => s.yearFrom);
  const yearTo = useHistoricalMapStore((s) => s.yearTo);
  const setYearRange = useHistoricalMapStore((s) => s.setYearRange);
  const resetPlayer = useHistoricalMapStore((s) => s.resetPlayer);

  const from = yearFrom ?? minYear;
  const to = yearTo ?? maxYear;

  return (
    <div className="rounded-2xl border border-amber-200/50 bg-[#f7f0df]/90 px-4 py-3 dark:border-amber-900/30 dark:bg-slate-900/90">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs uppercase tracking-[0.2em] text-amber-800/70 dark:text-amber-200/70">Year filter</p>
        {timelineHref && (
          <a href={timelineHref} className="text-xs text-family-primary underline dark:text-family-accent">
            Open Timeline ↗
          </a>
        )}
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="text-xs text-stone-500">
          From
          <input
            type="range"
            min={minYear}
            max={maxYear}
            value={from}
            onChange={(e) => {
              const next = Number(e.target.value);
              setYearRange(Math.min(next, to), to);
              resetPlayer();
            }}
            className="mt-1 w-full accent-amber-700"
          />
          <span className="font-serif text-sm text-family-ink dark:text-amber-50">{from}</span>
        </label>
        <label className="text-xs text-stone-500">
          To
          <input
            type="range"
            min={minYear}
            max={maxYear}
            value={to}
            onChange={(e) => {
              const next = Number(e.target.value);
              setYearRange(from, Math.max(next, from));
              resetPlayer();
            }}
            className="mt-1 w-full accent-amber-700"
          />
          <span className="font-serif text-sm text-family-ink dark:text-amber-50">{to}</span>
        </label>
      </div>
    </div>
  );
}
