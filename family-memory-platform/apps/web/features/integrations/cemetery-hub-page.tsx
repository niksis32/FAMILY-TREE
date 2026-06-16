'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { useAuth } from '@/components/auth-provider';
import { Button } from '@/components/ui';
import { PageHero } from '@family/ui';
import { apiClient, formatApiError } from '@/lib/api-client';

export function CemeteryHubPage() {
  const { session, isReady } = useAuth();
  const t = useTranslations('block5.cemetery');
  const [cemeteries, setCemeteries] = useState<unknown[]>([]);
  const [burials, setBurials] = useState<unknown[]>([]);
  const [mapData, setMapData] = useState<unknown>(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!session?.accessToken) return;
    setError('');
    try {
      const [c, b, m] = await Promise.all([
        apiClient.cemetery.listCemeteries(session.accessToken),
        apiClient.cemetery.listBurialSites(session.accessToken),
        apiClient.cemetery.map(session.accessToken),
      ]);
      setCemeteries(c);
      setBurials(b);
      setMapData(m);
    } catch (err) {
      setError(formatApiError(err));
    }
  }, [session?.accessToken]);

  useEffect(() => {
    if (!isReady) return;
    void load();
  }, [isReady, load]);

  return (
    <div className="space-y-6">
      <PageHero
        eyebrow={t('eyebrow')}
        title={t('title')}
        description={t('description')}
        action={
          <div className="flex flex-wrap gap-2">
            <Link href="/cemeteries/map">
              <Button variant="secondary">{t('openCemeteryMap')}</Button>
            </Link>
            <Link href="/map">
              <Button variant="secondary">{t('openMap')}</Button>
            </Link>
          </div>
        }
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border p-4 dark:border-slate-700">
          <p className="text-2xl font-semibold">{cemeteries.length}</p>
          <p className="text-sm text-stone-500">{t('cemeteries')}</p>
        </div>
        <div className="rounded-lg border p-4 dark:border-slate-700">
          <p className="text-2xl font-semibold">{burials.length}</p>
          <p className="text-sm text-stone-500">{t('burials')}</p>
        </div>
        <div className="rounded-lg border p-4 dark:border-slate-700">
          <p className="text-2xl font-semibold">
            {(mapData as { markers?: unknown[] })?.markers?.length ?? burials.length}
          </p>
          <p className="text-sm text-stone-500">{t('onMap')}</p>
        </div>
      </div>
    </div>
  );
}
