'use client';

import { useEffect, useState } from 'react';
import { PersonCard, PrivacyBadge } from '@/components/domain';
import { useAuth } from '@/components/auth-provider';
import { Card, EmptyState } from '@/components/ui';
import { apiClient } from '@/lib/api-client';
import type { PersonSummary } from '@family/shared';

export function PersonDetailsWorkspace({ id }: { id: string }) {
  const { session } = useAuth();
  const [person, setPerson] = useState<PersonSummary | null>(null);
  const [status, setStatus] = useState('Загружаем профиль персоны...');

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const data = await apiClient.persons.one(id, session?.accessToken);
        if (cancelled) return;
        setPerson(data);
        setStatus('Профиль загружен из API');
      } catch (error) {
        if (cancelled) return;
        setStatus(error instanceof Error ? error.message : 'Не удалось загрузить профиль');
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [id, session?.accessToken]);

  if (!person) {
    return <EmptyState title="Профиль не загружен" description={status} />;
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
      <PersonCard person={person} />
      <Card>
        <div className="flex flex-wrap gap-3">
          <PrivacyBadge level="family" />
        </div>
        <h2 className="mt-6 text-xl font-semibold">Биография</h2>
        <p className="mt-3 text-sm leading-6 text-stone-600 dark:text-slate-300">
          {'biography' in person && typeof person.biography === 'string' ? person.biography : 'Биография пока не заполнена.'}
        </p>
        <p className="mt-6 text-xs text-stone-400">{status}</p>
      </Card>
    </div>
  );
}
