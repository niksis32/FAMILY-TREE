'use client';

import { useHistoricalMapStore } from './use-historical-map-store';
import { Button } from '@/components/ui';

const SPEED_OPTIONS = [0.5, 1, 1.5, 2];

export function MigrationPlayer() {
  const playerActive = useHistoricalMapStore((s) => s.playerActive);
  const playerPaused = useHistoricalMapStore((s) => s.playerPaused);
  const playerProgress = useHistoricalMapStore((s) => s.playerProgress);
  const playerSpeed = useHistoricalMapStore((s) => s.playerSpeed);
  const setPlayerActive = useHistoricalMapStore((s) => s.setPlayerActive);
  const setPlayerPaused = useHistoricalMapStore((s) => s.setPlayerPaused);
  const setPlayerProgress = useHistoricalMapStore((s) => s.setPlayerProgress);
  const setPlayerSpeed = useHistoricalMapStore((s) => s.setPlayerSpeed);
  const resetPlayer = useHistoricalMapStore((s) => s.resetPlayer);

  return (
    <div className="rounded-2xl border border-amber-200/50 bg-[#f7f0df]/90 px-4 py-3 dark:border-amber-900/30 dark:bg-slate-900/90">
      <div className="flex flex-wrap items-center gap-2">
        {!playerActive ? (
          <Button variant="secondary" className="text-xs" onClick={() => setPlayerActive(true)}>
            ▶ Play route
          </Button>
        ) : (
          <>
            <Button variant="secondary" className="text-xs" onClick={() => setPlayerPaused(!playerPaused)}>
              {playerPaused ? '▶ Resume' : '⏸ Pause'}
            </Button>
            <Button variant="ghost" className="text-xs" onClick={resetPlayer}>
              ⏹ Stop
            </Button>
          </>
        )}
        <label className="ml-auto flex items-center gap-2 text-xs text-stone-500">
          Speed
          <select
            value={playerSpeed}
            onChange={(e) => setPlayerSpeed(Number(e.target.value))}
            className="rounded-lg border bg-white px-2 py-1 dark:bg-slate-950"
          >
            {SPEED_OPTIONS.map((speed) => (
              <option key={speed} value={speed}>
                {speed}x
              </option>
            ))}
          </select>
        </label>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={Math.round(playerProgress * 100)}
        onChange={(e) => setPlayerProgress(Number(e.target.value) / 100)}
        className="mt-3 w-full accent-amber-700"
        aria-label="Route progress"
      />
    </div>
  );
}