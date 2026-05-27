'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { useAuth } from '@/components/auth-provider';
import { Badge, Button, Card, FormField, Input, PageHeader, Select } from '@/components/ui';
import { apiClient, formatApiError, type CommunityGroupRecord } from '@/lib/api-client';

const TYPE_OPTIONS = ['', 'SURNAME', 'REGION', 'COUNTRY', 'PERIOD', 'TOPIC'] as const;

export function CommunityGroupsCatalogPage() {
  const searchParams = useSearchParams();
  const initialType = searchParams.get('type') ?? '';
  const { session, isReady } = useAuth();
  const t = useTranslations('community.groups');
  const [type, setType] = useState(initialType);
  const [q, setQ] = useState('');
  const [groups, setGroups] = useState<CommunityGroupRecord[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setType(searchParams.get('type') ?? '');
  }, [searchParams]);

  const load = useCallback(async () => {
    try {
      setError('');
      setLoading(true);
      const list = await apiClient.community.groupsList(
        { type: type || undefined, q: q.trim() || undefined },
        session?.accessToken ?? null,
      );
      setGroups(Array.isArray(list) ? list : []);
    } catch (err) {
      setError(formatApiError(err));
      setGroups([]);
    } finally {
      setLoading(false);
    }
  }, [session?.accessToken, type, q]);

  useEffect(() => {
    if (!isReady) return;
    void load();
  }, [isReady, load]);

  return (
    <div className="space-y-8">
      <PageHeader title={t('title')} description={t('description')} />

      {error && <p className="text-sm text-rose-600">{error}</p>}

      <Card className="grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
        <FormField label={t('searchPlaceholder')}>
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t('searchPlaceholder')}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void load();
            }}
          />
        </FormField>
        <FormField label={t('filterType')}>
          <Select value={type} onChange={(e) => setType(e.target.value)}>
            {TYPE_OPTIONS.map((opt) => (
              <option key={opt || 'ALL'} value={opt}>
                {opt === ''
                  ? t('typeAll')
                  : opt === 'SURNAME'
                    ? t('typeSURNAME')
                    : opt === 'REGION'
                      ? t('typeREGION')
                      : opt === 'COUNTRY'
                        ? t('typeCOUNTRY')
                        : opt === 'PERIOD'
                          ? t('typePERIOD')
                          : t('typeTOPIC')}
              </option>
            ))}
          </Select>
        </FormField>
        <Button variant="primary" onClick={() => void load()}>
          {t('apply')}
        </Button>
      </Card>

      {loading && <p className="text-sm text-stone-500">{t('loading')}</p>}

      {!loading && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {groups.length === 0 ? (
            <p className="text-sm text-stone-500">{t('empty')}</p>
          ) : (
            groups.map((g) => (
              <Card key={g.id} className="flex flex-col justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-semibold text-family-ink dark:text-white">{g.title}</h3>
                    <Badge tone="gold">{g.type}</Badge>
                  </div>
                  {g.description && (
                    <p className="mt-2 line-clamp-3 text-sm text-stone-600 dark:text-slate-400">{g.description}</p>
                  )}
                </div>
                <Link href={`/community/groups/${g.id}`}>
                  <Button variant="secondary" className="w-full">
                    {t('openGroup')}
                  </Button>
                </Link>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
}
