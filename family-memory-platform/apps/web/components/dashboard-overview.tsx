'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/auth-provider';
import { Card, StatCard } from '@/components/ui';
import { apiClient } from '@/lib/api-client';

export function DashboardOverview() {
  const { session } = useAuth();
  const [stats, setStats] = useState({ persons: 0, families: 0, media: 0, documents: 0 });
  const [status, setStatus] = useState('Загружаем dashboard metrics из backend...');

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
        if (cancelled) return;
        setStats({ persons: persons.length, families: families.length, media: media.length, documents: documents.length });
        setStatus('Dashboard metrics загружены из API');
      } catch (error) {
        if (cancelled) return;
        setStatus(error instanceof Error ? error.message : 'Не удалось загрузить dashboard metrics');
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [session?.accessToken]);

  return (
    <div className="space-y-6">
      <p className="text-sm text-stone-500 dark:text-slate-400">{status}</p>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Персоны" value={String(stats.persons)} hint="данные из /persons" />
        <StatCard label="Семьи" value={String(stats.families)} hint="данные из /families" />
        <StatCard label="Медиа" value={String(stats.media)} hint="metadata из /media" />
        <StatCard label="Документы" value={String(stats.documents)} hint="данные из /documents" />
      </div>

      <Card>
        <h2 className="text-xl font-semibold">Следующие runtime-проверки</h2>
        <div className="mt-5 grid gap-3">
          {['Swagger smoke: auth + CRUD', 'Frontend forms: create person/family/relationship/event/place/document/source/citation', 'Search reindex и live search', 'Tree/timeline root person на seed data'].map((item) => (
            <div key={item} className="rounded-2xl border bg-stone-50 p-4 text-sm dark:bg-slate-950">
              {item}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
