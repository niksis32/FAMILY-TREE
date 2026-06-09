'use client';

import { useState } from 'react';
import { Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { Badge, Button, Card } from '@/components/ui';
import type { TreeViewDataResponse, TreeViewNode } from '@family/shared';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '@/components/auth-provider';
import { ShareModal } from '@/features/privacy/share-modal';

export function PersonInsightPanel({
  selectedNode,
  data,
}: {
  selectedNode: TreeViewNode | null;
  data: TreeViewDataResponse | null;
}) {
  const { session } = useAuth();
  const [shareOpen, setShareOpen] = useState(false);
  const t = useTranslations('treeExperience');
  const tCommon = useTranslations('common');

  const media = data?.mediaPreview.filter((m) => m.personId === selectedNode?.personId) ?? [];
  const events = data?.events.filter((e) => e.personId === selectedNode?.personId).slice(0, 6) ?? [];

  return (
    <Card className="sticky top-28 max-h-[calc(100vh-8rem)] overflow-y-auto border-family-accent/20 bg-gradient-to-b from-white to-family-surface/80 dark:from-slate-900 dark:to-slate-950">
      <p className="text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-family-accent">{t('insight.eyebrow')}</p>
      <h2 className="font-serif mt-1 text-xl font-semibold text-family-ink dark:text-white">{t('insight.title')}</h2>

      <AnimatePresence mode="wait">
        {selectedNode ? (
          <motion.div
            key={selectedNode.personId}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
          >
            <div className="mt-4 rounded-2xl border border-family-accent/30 bg-gradient-to-br from-family-accent/8 to-white p-4 shadow-sm dark:from-family-accent/10 dark:to-slate-950/90">
              {selectedNode.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <motion.img
                  initial={{ scale: 0.92, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  src={selectedNode.avatarUrl}
                  alt={selectedNode.label}
                  className="mb-3 h-24 w-24 rounded-xl object-cover ring-2 ring-cyan-500/30"
                />
              ) : null}
              <p className="text-xs text-stone-500 dark:text-slate-400">{t('insight.selected')}</p>
              <p className="mt-1 text-lg font-semibold">{selectedNode.label}</p>
              <p className="mt-1 text-sm text-stone-500 dark:text-slate-400">
                {[selectedNode.birthYear, selectedNode.deathYear].filter(Boolean).join(' — ') || tCommon('noDate')}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Badge tone={selectedNode.isLiving ? 'green' : 'muted'}>
                  {selectedNode.isLiving ? t('insight.living') : t('insight.deceased')}
                </Badge>
                <Badge tone="gold">{t('insight.generation', { gen: selectedNode.generation })}</Badge>
              </div>
              <Link
                href={`/persons/${selectedNode.personId}`}
                className="mt-3 inline-block text-sm font-semibold text-family-primary underline dark:text-family-accent"
              >
                {t('insight.openProfile')}
              </Link>
              {session?.accessToken ? (
                <Button className="mt-3" variant="secondary" type="button" onClick={() => setShareOpen(true)}>
                  Поделиться
                </Button>
              ) : null}
            </div>

            {media.length > 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.08 }}
                className="mt-6"
              >
                <p className="text-sm font-semibold">{t('insight.media')}</p>
                <ul className="mt-2 space-y-2">
                  {media.map((item) => (
                    <li key={item.mediaId} className="text-xs text-stone-600 dark:text-slate-300">
                      {item.title ?? item.mimeType}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ) : null}

            {events.length > 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.12 }}
                className="mt-6"
              >
                <p className="text-sm font-semibold">{t('insight.events')}</p>
                <ul className="mt-2 space-y-2">
                  {events.map((event) => (
                    <li key={event.id} className="rounded-lg border px-2 py-1.5 text-xs dark:border-slate-800">
                      <span className="font-medium">{event.title}</span>
                      {event.year ? <span className="ml-1 text-stone-500">({event.year})</span> : null}
                      {event.placeName ? <span className="block text-stone-500">{event.placeName}</span> : null}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ) : null}
          </motion.div>
        ) : (
          <motion.p
            key="hint"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="mt-3 text-sm text-stone-600 dark:text-slate-300"
          >
            {t('insight.hint')}
          </motion.p>
        )}
      </AnimatePresence>

      {session?.accessToken && selectedNode ? (
        <ShareModal
          open={shareOpen}
          onClose={() => setShareOpen(false)}
          token={session.accessToken}
          resourceType="PERSON"
          resourceId={selectedNode.personId}
          label={selectedNode.label}
        />
      ) : null}
    </Card>
  );
}
