'use client';

import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import type { ThreeHighlightMode } from '@family/tree-experience';

const SWATCHES: { key: string; color: string }[] = [
  { key: 'living', color: '#2dd4bf' },
  { key: 'deceased', color: '#64748b' },
  { key: 'highlight', color: '#fbbf24' },
  { key: 'parentEdge', color: '#38bdf8' },
  { key: 'spouseEdge', color: '#c084fc' },
  { key: 'event', color: '#f472b6' },
];

export function TreeLegend({ highlightMode }: { highlightMode: ThreeHighlightMode }) {
  const t = useTranslations('treeExperience.threeD.legend');

  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      className="pointer-events-none absolute bottom-4 left-4 z-20 max-w-[200px] rounded-2xl border border-slate-700/80 bg-slate-950/90 px-3 py-2.5 text-xs shadow-lg backdrop-blur-sm"
    >
      <p className="mb-2 font-semibold text-slate-200">{t('title')}</p>
      <ul className="space-y-1.5">
        {SWATCHES.map((item) => (
          <li key={item.key} className="flex items-center gap-2 text-slate-400">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
            {t(item.key)}
          </li>
        ))}
      </ul>
      {highlightMode !== 'none' ? (
        <p className="mt-2 border-t border-slate-800 pt-2 text-[10px] text-cyan-400/90">
          {t('activeHighlight', { mode: t(`modes.${highlightMode}`) })}
        </p>
      ) : null}
    </motion.div>
  );
}
