'use client';

import type { ThreeHighlightMode } from '@family/tree-experience';
import type { TreeViewDataResponse } from '@family/shared';
import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { useMemo } from 'react';
import { useTree3dStore } from './use-tree-3d-store';

const HIGHLIGHT_MODES: ThreeHighlightMode[] = [
  'none',
  'ancestors',
  'descendants',
  'paternal',
  'maternal',
];

export function Tree3dToolbar({ data }: { data: TreeViewDataResponse }) {
  const t = useTranslations('treeExperience.threeD.toolbar');

  const highlightMode = useTree3dStore((s) => s.highlightMode);
  const setHighlightMode = useTree3dStore((s) => s.setHighlightMode);
  const generationMin = useTree3dStore((s) => s.generationMin);
  const generationMax = useTree3dStore((s) => s.generationMax);
  const setGenerationRange = useTree3dStore((s) => s.setGenerationRange);
  const searchQuery = useTree3dStore((s) => s.searchQuery);
  const setSearchQuery = useTree3dStore((s) => s.setSearchQuery);
  const cinematicActive = useTree3dStore((s) => s.cinematicActive);
  const setCinematicActive = useTree3dStore((s) => s.setCinematicActive);
  const cinematicPaused = useTree3dStore((s) => s.cinematicPaused);
  const setCinematicPaused = useTree3dStore((s) => s.setCinematicPaused);
  const focusedPersonId = useTree3dStore((s) => s.focusedPersonId);
  const setFocusedPersonId = useTree3dStore((s) => s.setFocusedPersonId);
  const requestCameraReset = useTree3dStore((s) => s.requestCameraReset);

  const genRange = useMemo(() => {
    const gens = data.nodes.map((n) => n.generation);
    return { min: Math.min(...gens), max: Math.max(...gens) };
  }, [data.nodes]);

  const sliderMin = generationMin ?? genRange.min;
  const sliderMax = generationMax ?? genRange.max;

  const handleSearch = () => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return;
    const match = data.nodes.find(
      (n) =>
        n.label.toLowerCase().includes(q) ||
        n.givenName.toLowerCase().includes(q) ||
        (n.familyName?.toLowerCase().includes(q) ?? false),
    );
    if (match) {
      setFocusedPersonId(match.personId);
      setHighlightMode('focus');
    }
  };

  const handleFocusRoot = () => {
    setFocusedPersonId(data.meta.rootPersonId);
    setHighlightMode('focus');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="absolute right-3 top-3 z-20 flex max-w-[min(100%,320px)] flex-col gap-2 rounded-2xl border border-slate-700/80 bg-slate-950/92 p-3 shadow-xl backdrop-blur-sm"
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-cyan-400/90">{t('title')}</p>

      <div className="flex flex-wrap gap-1">
        {HIGHLIGHT_MODES.map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => setHighlightMode(mode)}
            className={`rounded-lg px-2 py-1 text-[10px] font-medium transition ${
              highlightMode === mode
                ? 'bg-cyan-600/30 text-cyan-100 ring-1 ring-cyan-500/50'
                : 'bg-slate-800/80 text-slate-400 hover:bg-slate-700'
            }`}
          >
            {t(`highlight.${mode}`)}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-1">
        <button
          type="button"
          onClick={handleFocusRoot}
          className="rounded-lg bg-slate-800 px-2 py-1 text-[10px] text-slate-300 hover:bg-slate-700"
        >
          {t('focusRoot')}
        </button>
        <button
          type="button"
          onClick={requestCameraReset}
          className="rounded-lg bg-slate-800 px-2 py-1 text-[10px] text-slate-300 hover:bg-slate-700"
        >
          {t('resetCamera')}
        </button>
      </div>

      <label className="text-[10px] text-slate-500">
        {t('generationRange', { min: sliderMin, max: sliderMax })}
      </label>
      <div className="grid grid-cols-2 gap-2">
        <input
          type="range"
          min={genRange.min}
          max={genRange.max}
          value={sliderMin}
          onChange={(e) => setGenerationRange(Number(e.target.value), generationMax)}
          className="w-full accent-cyan-500"
        />
        <input
          type="range"
          min={genRange.min}
          max={genRange.max}
          value={sliderMax}
          onChange={(e) => setGenerationRange(generationMin, Number(e.target.value))}
          className="w-full accent-cyan-500"
        />
      </div>

      <div className="flex gap-1">
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder={t('searchPh')}
          className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-200"
        />
        <button
          type="button"
          onClick={handleSearch}
          className="rounded-lg bg-cyan-700/40 px-2 py-1 text-[10px] text-cyan-100"
        >
          {t('search')}
        </button>
      </div>

      <div className="flex flex-wrap gap-1 border-t border-slate-800 pt-2">
        <button
          type="button"
          onClick={() => setCinematicActive(!cinematicActive)}
          className={`rounded-lg px-2 py-1 text-[10px] ${
            cinematicActive ? 'bg-violet-600/40 text-violet-100' : 'bg-slate-800 text-slate-300'
          }`}
        >
          {cinematicActive ? t('cinematicStop') : t('cinematicStart')}
        </button>
        {cinematicActive ? (
          <button
            type="button"
            onClick={() => setCinematicPaused(!cinematicPaused)}
            className="rounded-lg bg-slate-800 px-2 py-1 text-[10px] text-slate-300"
          >
            {cinematicPaused ? t('cinematicResume') : t('cinematicPause')}
          </button>
        ) : null}
      </div>

      {focusedPersonId ? (
        <p className="text-[10px] text-slate-500">{t('focused', { id: focusedPersonId.slice(0, 8) })}</p>
      ) : null}
    </motion.div>
  );
}
