'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  FileText,
  Image,
  Shuffle,
  Sparkles,
  Wand2,
} from 'lucide-react';
import type { MatchProfileDto, TreeMatchCandidateDto } from '@family/shared';
import { useAuth } from '@/components/auth-provider';
import { PageHero, QuickActionCard } from '@family/ui';
import { PremiumLink } from '@/lib/premium-link';
import { Badge, Button, Card } from '@/components/ui';
import { Link } from '@/i18n/navigation';
import { apiClient, formatApiError, type DocumentRecord } from '@/lib/api-client';

export function AiLabPage() {
  const { session, isReady } = useAuth();
  const t = useTranslations('aiLab');
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [mediaCount, setMediaCount] = useState(0);
  const [candidates, setCandidates] = useState<TreeMatchCandidateDto[]>([]);
  const [profile, setProfile] = useState<MatchProfileDto | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!session?.accessToken) return;
    setLoading(true);
    setError('');
    try {
      const [docs, media, inbox, matchProfile] = await Promise.all([
        apiClient.documents.list(session.accessToken),
        apiClient.media.list(session.accessToken),
        apiClient.matching.inbox(session.accessToken).catch(() => [] as TreeMatchCandidateDto[]),
        apiClient.matching.profile(session.accessToken).catch(() => null),
      ]);
      setDocuments(docs.slice(0, 5));
      setMediaCount(media.length);
      setCandidates(inbox.slice(0, 4));
      setProfile(matchProfile);
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setLoading(false);
    }
  }, [session?.accessToken]);

  useEffect(() => {
    if (!isReady) return;
    void load();
  }, [isReady, load]);

  return (
    <div className="space-y-8">
      <PageHero
        eyebrow={t('eyebrow')}
        title={t('title')}
        description={t('description')}
        action={
          <Button variant="secondary" onClick={() => void load()} disabled={loading}>
            {t('refresh')}
          </Button>
        }
      />

      {error ? <p className="text-sm text-rose-600">{error}</p> : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <QuickActionCard LinkComponent={PremiumLink} href="/story-drafts" title={t('storyDrafts')} description={t('storyDraftsDesc')} icon={<Wand2 className="h-5 w-5" />} />
        <QuickActionCard LinkComponent={PremiumLink} href="/media/tagging" title={t('photoIntel')} description={t('photoIntelDesc')} icon={<Image className="h-5 w-5" />} />
        <QuickActionCard LinkComponent={PremiumLink} href="/documents" title={t('docIntel')} description={t('docIntelDesc')} icon={<FileText className="h-5 w-5" />} />
        <QuickActionCard LinkComponent={PremiumLink} href="/matching" title={t('matches')} description={t('matchesDesc')} icon={<Shuffle className="h-5 w-5" />} />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="!p-0 overflow-hidden">
          <div className="border-b border-stone-200/80 bg-family-primary/5 px-6 py-4 dark:border-slate-800 dark:bg-slate-900/50">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-family-primary dark:text-family-accent" />
              <h2 className="font-serif text-lg font-semibold">{t('recentDocuments')}</h2>
            </div>
            <p className="mt-1 text-sm text-stone-500 dark:text-slate-400">{t('recentDocumentsHint')}</p>
          </div>
          <ul className="divide-y divide-stone-100 dark:divide-slate-800">
            {loading && documents.length === 0 ? (
              <li className="px-6 py-8 text-sm text-stone-500">{t('loading')}</li>
            ) : documents.length === 0 ? (
              <li className="px-6 py-8 text-sm text-stone-500">{t('emptyDocuments')}</li>
            ) : (
              documents.map((doc) => (
                <li key={doc.id} className="flex items-center justify-between gap-4 px-6 py-4">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-family-ink dark:text-white">{doc.title || doc.fileName}</p>
                    <p className="text-xs text-stone-500">{doc.mimeType}</p>
                  </div>
                  <Link href={`/documents/${doc.id}/intelligence`}>
                    <Button variant="secondary">{t('openIntel')}</Button>
                  </Link>
                </li>
              ))
            )}
          </ul>
        </Card>

        <Card className="!p-0 overflow-hidden">
          <div className="border-b border-stone-200/80 bg-family-accent/10 px-6 py-4 dark:border-slate-800 dark:bg-family-accent/5">
            <div className="flex items-center gap-2">
              <Shuffle className="h-5 w-5 text-family-primary dark:text-family-accent" />
              <h2 className="font-serif text-lg font-semibold">{t('matchSuggestions')}</h2>
            </div>
            <p className="mt-1 text-sm text-stone-500 dark:text-slate-400">{t('matchSuggestionsHint')}</p>
          </div>
          <ul className="divide-y divide-stone-100 dark:divide-slate-800">
            {loading && candidates.length === 0 ? (
              <li className="px-6 py-8 text-sm text-stone-500">{t('loading')}</li>
            ) : candidates.length === 0 ? (
              <li className="px-6 py-8 text-sm text-stone-500">{t('emptyMatches')}</li>
            ) : (
              candidates.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-4 px-6 py-4">
                  <div>
                    <p className="font-medium">
                      {[c.sourcePerson?.displayName, c.targetPerson?.displayName].filter(Boolean).join(' ↔ ') || c.id}
                    </p>
                    <Badge tone="gold">{t('confidence', { score: Math.round(c.score) })}</Badge>
                  </div>
                  <Link href={`/matching/compare/${c.id}`}>
                    <Button variant="ghost">{t('review')}</Button>
                  </Link>
                </li>
              ))
            )}
          </ul>
        </Card>
      </div>

      <Card>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-family-primary/10 text-family-primary dark:bg-family-accent/15 dark:text-family-accent">
              <Image className="h-5 w-5" />
            </span>
            <div>
              <h2 className="font-serif text-lg font-semibold">{t('photoWorkspace')}</h2>
              <p className="mt-1 text-sm text-stone-600 dark:text-slate-400">{t('photoWorkspaceDesc', { count: mediaCount })}</p>
            </div>
          </div>
          <Link href="/media/tagging">
            <Button>{t('openTagging')}</Button>
          </Link>
        </div>
      </Card>

      <Card className="border-dashed border-family-accent/30 bg-family-accent/5 dark:bg-family-accent/5">
        <div className="flex items-start gap-3">
          <Sparkles className="mt-1 h-5 w-5 text-family-accent" />
          <div>
            <p className="font-serif font-semibold text-family-ink dark:text-white">{t('matchProfileTitle')}</p>
            <p className="mt-2 text-sm text-stone-600 dark:text-slate-300">
              {profile?.isOptedIn ? t('matchOptIn') : t('matchOptOut')}
            </p>
            <Link href="/settings/privacy-center" className="mt-3 inline-block text-sm font-semibold text-family-primary dark:text-family-accent">
              {t('privacyLink')} →
            </Link>
          </div>
        </div>
      </Card>
    </div>
  );
}
