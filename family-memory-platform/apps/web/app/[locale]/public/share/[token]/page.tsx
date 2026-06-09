'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card } from '@/components/ui';
import { apiClient } from '@/lib/api-client';

type PublicSharePayload =
  | { type: 'PERSON'; person: { givenName: string; familyName?: string | null; birthDate?: string | null } }
  | {
      type: 'FAMILY_TREE';
      familyId: string;
      tree?: { name?: string | null; members: Array<{ givenName: string; familyName?: string | null }> };
    }
  | { type: 'MEDIA_BUNDLE'; items: Array<{ id: string; fileName: string }> }
  | { type: string; resourceId?: string };

export default function PublicShareViewerPage() {
  const params = useParams<{ token: string }>();
  const [data, setData] = useState<{ share: { label: string | null; status: string }; payload: PublicSharePayload } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void apiClient.public
      .resolveShare(params.token)
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : 'Ссылка недоступна'));
  }, [params.token]);

  if (error) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-16">
        <Card>
          <h1 className="text-xl font-semibold">Ссылка недоступна</h1>
          <p className="mt-2 text-sm text-stone-600">{error}</p>
        </Card>
      </main>
    );
  }

  if (!data) {
    return <main className="px-4 py-16 text-center text-sm text-stone-500">Загрузка...</main>;
  }

  const { share, payload } = data;

  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-12">
      <Card>
        <p className="text-xs uppercase tracking-widest text-family-accent">Публичный просмотр</p>
        <h1 className="mt-2 text-2xl font-semibold">{share.label ?? 'Семейный архив'}</h1>
        <p className="mt-1 text-sm text-stone-500">Статус: {share.status}</p>
      </Card>

      {payload.type === 'PERSON' && 'person' in payload ? (
        <Card>
          <h2 className="text-lg font-semibold">
            {[payload.person.givenName, payload.person.familyName].filter(Boolean).join(' ')}
          </h2>
          {payload.person.birthDate ? <p className="mt-2 text-sm">Рождение: {payload.person.birthDate}</p> : null}
        </Card>
      ) : null}

      {payload.type === 'FAMILY_TREE' && payload.tree ? (
        <Card>
          <h2 className="text-lg font-semibold">{payload.tree.name ?? 'Семейное древо'}</h2>
          <ul className="mt-4 space-y-2">
            {payload.tree.members.map((m) => (
              <li key={`${m.givenName}-${m.familyName}`} className="rounded-lg border px-3 py-2 text-sm">
                {[m.givenName, m.familyName].filter(Boolean).join(' ')}
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {payload.type === 'MEDIA_BUNDLE' && 'items' in payload ? (
        <Card>
          <h2 className="text-lg font-semibold">Медиа</h2>
          <ul className="mt-3 space-y-1 text-sm">
            {payload.items.map((item) => (
              <li key={item.id}>{item.fileName}</li>
            ))}
          </ul>
        </Card>
      ) : null}
    </main>
  );
}
