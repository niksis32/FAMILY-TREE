'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { PersonMatchSuggestion } from '@family/shared';
import { apiClient } from '@/lib/api-client';
import { Card } from '@/components/ui';

interface SuggestedPersonMatchPanelProps {
  mediaId: string;
  faceTagId?: string;
  token?: string | null;
  onSelect: (personId: string) => void;
}

export function SuggestedPersonMatchPanel({
  mediaId,
  faceTagId,
  token,
  onSelect,
}: SuggestedPersonMatchPanelProps) {
  const t = useTranslations('photoIntelligence');
  const [suggestions, setSuggestions] = useState<PersonMatchSuggestion[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const data = await apiClient.photoIntelligence.suggestPerson(mediaId, faceTagId, token);
        if (!cancelled) setSuggestions(data);
      } catch {
        if (!cancelled) setSuggestions([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [mediaId, faceTagId, token]);

  return (
    <Card className="p-4">
      <h4 className="font-semibold">{t('suggestedMatches')}</h4>
      {loading ? <p className="mt-2 text-sm text-stone-500">{t('loadingSuggestions')}</p> : null}
      <ul className="mt-3 max-h-56 space-y-2 overflow-y-auto">
        {suggestions.map((item) => (
          <li key={item.personId}>
            <button
              type="button"
              className="flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left text-sm hover:bg-stone-50 dark:hover:bg-slate-900"
              onClick={() => onSelect(item.personId)}
            >
              <span>
                {[item.givenName, item.patronymic, item.familyName].filter(Boolean).join(' ')}
              </span>
              <span className="text-xs text-stone-400">{Math.round(item.confidence * 100)}%</span>
            </button>
          </li>
        ))}
        {!loading && suggestions.length === 0 ? (
          <p className="text-sm text-stone-500">{t('noSuggestions')}</p>
        ) : null}
      </ul>
    </Card>
  );
}
