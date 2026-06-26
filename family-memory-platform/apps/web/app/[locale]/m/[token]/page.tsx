'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card } from '@/components/ui';
import { apiClient } from '@/lib/api-client';

type PublicMemorial = {
  title: string;
  inscription?: string | null;
  cemeteryName?: string;
  cemeteryAddress?: string | null;
  plotLabel?: string | null;
  person?: { displayName: string; birthYear?: number | null; deathYear?: number | null } | null;
};

export default function PublicMemorialPage() {
  const params = useParams<{ token: string }>();
  const [data, setData] = useState<PublicMemorial | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void apiClient.public
      .resolveMemorial(params.token)
      .then((payload) => setData(payload as PublicMemorial))
      .catch((err) => setError(err instanceof Error ? err.message : 'Memorial unavailable'));
  }, [params.token]);

  if (error) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-16">
        <Card>
          <h1 className="text-xl font-semibold">Memorial unavailable</h1>
          <p className="mt-2 text-sm text-stone-600">{error}</p>
        </Card>
      </main>
    );
  }

  if (!data) {
    return <main className="px-4 py-16 text-center text-sm text-stone-500">Loading...</main>;
  }

  return (
    <main className="mx-auto max-w-2xl space-y-6 px-4 py-12">
      <Card>
        <p className="text-xs uppercase tracking-widest text-family-accent">Public memorial</p>
        <h1 className="mt-2 text-2xl font-semibold">{data.title}</h1>
        {data.person ? (
          <p className="mt-1 text-lg text-stone-700 dark:text-stone-200">{data.person.displayName}</p>
        ) : null}
        {data.person?.birthYear || data.person?.deathYear ? (
          <p className="mt-1 text-sm text-stone-500">
            {[data.person.birthYear, data.person.deathYear].filter(Boolean).join(' — ')}
          </p>
        ) : null}
        {data.inscription ? (
          <p className="mt-4 whitespace-pre-wrap text-sm italic text-stone-600">{data.inscription}</p>
        ) : null}
        <div className="mt-4 text-sm text-stone-500">
          <p>{data.cemeteryName}</p>
          {data.plotLabel ? <p>Plot: {data.plotLabel}</p> : null}
          {data.cemeteryAddress ? <p>{data.cemeteryAddress}</p> : null}
        </div>
      </Card>
    </main>
  );
}
