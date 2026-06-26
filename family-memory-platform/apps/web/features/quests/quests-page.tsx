'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { QuestInstance, QuestLeaderboardResponse } from '@family/shared';
import { useAuth } from '@/components/auth-provider';
import { Button, Card, Input } from '@/components/ui';
import { PageHero } from '@family/ui';
import { QuestDashboard } from '@/features/gamification/quest-dashboard';
import { apiClient, formatApiError } from '@/lib/api-client';

export function QuestsPage() {
  const t = useTranslations('questsPage');
  const { session } = useAuth();
  const token = session?.accessToken;
  const [quests, setQuests] = useState<QuestInstance[]>([]);
  const [leaderboard, setLeaderboard] = useState<QuestLeaderboardResponse | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const [questPayload, board] = await Promise.all([
        apiClient.gamification.quests(token),
        apiClient.gamification.leaderboard(token),
      ]);
      setQuests((questPayload as { quests: QuestInstance[] }).quests ?? []);
      setLeaderboard(board);
      setDisplayName(board.myOptIn.displayName ?? '');
    } catch (e) {
      setError(formatApiError(e));
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const toggleOptIn = async () => {
    if (!token || !leaderboard) return;
    try {
      const next = !leaderboard.myOptIn.optedIn;
      await apiClient.gamification.setLeaderboardOptIn({ optedIn: next, displayName: displayName || null }, token);
      await load();
    } catch (e) {
      setError(formatApiError(e));
    }
  };

  return (
    <div className="space-y-8">
      <PageHero eyebrow={t('eyebrow')} title={t('title')} description={t('description')} />

      <Card className="p-5">
        <h3 className="font-semibold">{t('leaderboardTitle')}</h3>
        <p className="mt-1 text-sm text-stone-500">{t('leaderboardHint')}</p>
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <Input
            placeholder={t('displayName')}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="max-w-xs"
          />
          <Button type="button" onClick={() => void toggleOptIn()}>
            {leaderboard?.myOptIn.optedIn ? t('optOut') : t('optIn')}
          </Button>
        </div>
        {leaderboard?.entries.length ? (
          <ol className="mt-4 space-y-2">
            {leaderboard.entries.map((entry) => (
              <li key={entry.userId} className="flex justify-between rounded-xl bg-stone-50 px-3 py-2 text-sm dark:bg-slate-900">
                <span>
                  #{entry.rank} {entry.displayName}
                </span>
                <span className="text-stone-500">
                  {entry.score} · {entry.completedQuests} quests
                </span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="mt-3 text-sm text-stone-500">{t('leaderboardEmpty')}</p>
        )}
        {leaderboard?.branchCompletions.length ? (
          <div className="mt-4 border-t pt-4">
            <p className="text-sm font-medium">{t('branchCompletion')}</p>
            <ul className="mt-2 space-y-1 text-sm text-stone-600">
              {leaderboard.branchCompletions.map((b) => (
                <li key={b.familyId}>
                  {b.familyName}: {b.percent}%
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </Card>

      <QuestDashboard quests={quests} weeklyGoals={{ weekStart: '', weekEnd: '', goals: [] }} />
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
