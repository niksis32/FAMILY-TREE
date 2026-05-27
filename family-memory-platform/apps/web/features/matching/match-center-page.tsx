'use client';

import type { TreeMatchCandidateDto } from '@family/shared';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/components/auth-provider';
import { Button, Input } from '@/components/ui';
import { apiClient, formatApiError } from '@/lib/api-client';
import { MatchCandidateCard } from './match-candidate-card';

export function MatchCenterPage() {
  const t = useTranslations('matching');
  const { session } = useAuth();
  const token = session?.accessToken;
  const [optedIn, setOptedIn] = useState(false);
  const [inbox, setInbox] = useState<TreeMatchCandidateDto[]>([]);
  const [familyId, setFamilyId] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const profile = await apiClient.matching.profile(token);
      setOptedIn(profile.isOptedIn);
      if (profile.isOptedIn) {
        const list = await apiClient.matching.inbox(token);
        setInbox(list);
      } else {
        setInbox([]);
      }
    } catch (e) {
      setError(formatApiError(e));
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const toggleOptIn = async () => {
    if (!token) return;
    setBusy(true);
    try {
      await apiClient.matching.updateProfile(!optedIn, token);
      await refresh();
    } catch (e) {
      setError(formatApiError(e));
    } finally {
      setBusy(false);
    }
  };

  const runScan = async () => {
    if (!token || !familyId.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await apiClient.matching.runForTree(familyId.trim(), token);
      await refresh();
    } catch (e) {
      setError(formatApiError(e));
    } finally {
      setBusy(false);
    }
  };

  const handleAccept = async (id: string) => {
    if (!token) return;
    setBusy(true);
    try {
      await apiClient.matching.accept(id, token);
      await refresh();
    } catch (e) {
      setError(formatApiError(e));
    } finally {
      setBusy(false);
    }
  };

  const handleReject = async (id: string) => {
    if (!token) return;
    setBusy(true);
    try {
      await apiClient.matching.reject(id, token);
      await refresh();
    } catch (e) {
      setError(formatApiError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header>
        <h1 className="text-3xl font-semibold text-family-ink dark:text-white">{t('title')}</h1>
        <p className="mt-2 text-stone-600 dark:text-slate-300">{t('subtitle')}</p>
      </header>

      <section className="rounded-3xl border bg-white/80 p-6 dark:bg-slate-900/50">
        <h2 className="font-semibold">{t('optInTitle')}</h2>
        <p className="mt-1 text-sm text-stone-500">{t('optInHint')}</p>
        <p className="mt-3 text-sm font-medium">{optedIn ? t('optInOn') : t('optInOff')}</p>
        <Button className="mt-4" disabled={busy || !token} onClick={toggleOptIn}>
          {optedIn ? t('disable') : t('enable')}
        </Button>
      </section>

      {optedIn && (
        <section className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Input
              placeholder={t('familyIdPlaceholder')}
              value={familyId}
              onChange={(e) => setFamilyId(e.target.value)}
            />
            <Button disabled={busy} onClick={runScan}>
              {t('runScan')}
            </Button>
          </div>

          {loading && <p className="text-sm text-stone-400">{t('loading')}</p>}
          {error && <p className="text-sm text-red-600">{error}</p>}
          {!loading && inbox.length === 0 && (
            <p className="text-sm text-stone-500">{t('inboxEmpty')}</p>
          )}
          <div className="space-y-3">
            {inbox.map((c) => (
              <MatchCandidateCard
                key={c.id}
                candidate={c}
                busy={busy}
                onAccept={() => handleAccept(c.id)}
                onReject={() => handleReject(c.id)}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
