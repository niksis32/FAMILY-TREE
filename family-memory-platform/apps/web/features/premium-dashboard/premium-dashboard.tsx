'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { FileText, GitBranch, Image, Map, Sparkles, Users } from 'lucide-react';
import { useAuth } from '@/components/auth-provider';
import { GamificationOverview } from '@/components/gamification-overview';
import { MetricTile, PageHero, QuickActionCard } from '@family/ui';
import { PremiumLink } from '@/lib/premium-link';
import { Button } from '@/components/ui';
import { Link } from '@/i18n/navigation';
import { apiClient } from '@/lib/api-client';

export function PremiumDashboard() {
  const { session } = useAuth();
  const t = useTranslations('premiumDashboard');
  const [stats, setStats] = useState({ persons: 0, families: 0, media: 0, documents: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [persons, families, media, documents] = await Promise.all([
          apiClient.persons.list(session?.accessToken),
          apiClient.families.list(session?.accessToken),
          apiClient.media.list(session?.accessToken),
          apiClient.documents.list(session?.accessToken),
        ]);
        if (!cancelled) {
          setStats({
            persons: persons.length,
            families: families.length,
            media: media.length,
            documents: documents.length,
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [session?.accessToken]);

  return (
    <div className="space-y-8">
      <PageHero
        eyebrow={t('eyebrow')}
        title={t('title')}
        description={t('description')}
        action={
          <Link href="/persons">
            <Button>{t('addPerson')}</Button>
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricTile label={t('statPersons')} value={loading ? '…' : String(stats.persons)} hint={t('hintPersons')} icon={<Users className="h-4 w-4" />} tone="ink" />
        <MetricTile label={t('statFamilies')} value={loading ? '…' : String(stats.families)} hint={t('hintFamilies')} icon={<GitBranch className="h-4 w-4" />} />
        <MetricTile label={t('statMedia')} value={loading ? '…' : String(stats.media)} hint={t('hintMedia')} icon={<Image className="h-4 w-4" />} tone="gold" />
        <MetricTile label={t('statDocuments')} value={loading ? '…' : String(stats.documents)} hint={t('hintDocuments')} icon={<FileText className="h-4 w-4" />} />
      </div>

      <section>
        <h2 className="font-serif text-xl font-semibold text-family-ink dark:text-white">{t('quickActionsTitle')}</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <QuickActionCard LinkComponent={PremiumLink} href="/tree" title={t('actionTree')} description={t('actionTreeDesc')} icon={<GitBranch className="h-5 w-5" />} />
          <QuickActionCard LinkComponent={PremiumLink} href="/ai-lab" title={t('actionAi')} description={t('actionAiDesc')} icon={<Sparkles className="h-5 w-5" />} />
          <QuickActionCard LinkComponent={PremiumLink} href="/map" title={t('actionMap')} description={t('actionMapDesc')} icon={<Map className="h-5 w-5" />} />
          <QuickActionCard LinkComponent={PremiumLink} href="/research" title={t('actionResearch')} description={t('actionResearchDesc')} icon={<FileText className="h-5 w-5" />} />
        </div>
      </section>

      <GamificationOverview />
    </div>
  );
}
