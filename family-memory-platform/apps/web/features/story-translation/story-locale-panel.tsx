'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { StoryLocaleDto } from '@family/shared';
import { useAuth } from '@/components/auth-provider';
import { Button, Card, Input } from '@/components/ui';
import { apiClient, formatApiError } from '@/lib/api-client';

export function StoryLocalePanel({ storyId, sourceTitle, sourceNarrative }: { storyId: string; sourceTitle: string; sourceNarrative?: string | null }) {
  const t = useTranslations('storyTranslation');
  const { session } = useAuth();
  const token = session?.accessToken;
  const [locales, setLocales] = useState<StoryLocaleDto[]>([]);
  const [targetLocale, setTargetLocale] = useState('en');
  const [selected, setSelected] = useState<StoryLocaleDto | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const rows = await apiClient.storyLocales.list(storyId, token);
      setLocales(rows);
      setSelected(rows[0] ?? null);
    } catch (e) {
      setError(formatApiError(e));
    }
  }, [storyId, token]);

  useEffect(() => {
    void load();
  }, [load]);

  const translate = async () => {
    if (!token) return;
    setBusy(true);
    setError(null);
    try {
      const result = await apiClient.storyLocales.translate(storyId, { targetLocale }, token);
      setSelected(result.locale);
      await load();
    } catch (e) {
      setError(formatApiError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="mt-8 p-5">
      <h3 className="text-lg font-semibold">{t('title')}</h3>
      <p className="mt-1 text-sm text-stone-500">{t('hint')}</p>

      <div className="mt-4 flex flex-wrap gap-2">
        <Input value={targetLocale} onChange={(e) => setTargetLocale(e.target.value)} className="max-w-[120px]" placeholder="en" />
        <Button type="button" disabled={busy} onClick={() => void translate()}>
          {t('translate')}
        </Button>
      </div>

      {selected ? (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border p-4">
            <p className="text-xs font-medium uppercase text-stone-500">{t('source')}</p>
            <h4 className="mt-2 font-semibold">{sourceTitle}</h4>
            <p className="mt-2 whitespace-pre-wrap text-sm">{sourceNarrative ?? '—'}</p>
          </div>
          <div className="rounded-xl border p-4">
            <p className="text-xs font-medium uppercase text-stone-500">{selected.locale.toUpperCase()}</p>
            <h4 className="mt-2 font-semibold">{selected.title ?? '—'}</h4>
            <p className="mt-2 whitespace-pre-wrap text-sm">{selected.narrativeText ?? '—'}</p>
          </div>
        </div>
      ) : (
        <p className="mt-4 text-sm text-stone-500">{t('empty')}</p>
      )}

      {locales.length > 1 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {locales.map((loc) => (
            <Button key={loc.id} type="button" variant={selected?.id === loc.id ? 'primary' : 'ghost'} onClick={() => setSelected(loc)}>
              {loc.locale}
            </Button>
          ))}
        </div>
      ) : null}

      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
    </Card>
  );
}
