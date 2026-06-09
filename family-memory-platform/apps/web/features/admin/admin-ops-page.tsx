'use client';

import { useEffect, useState } from 'react';
import type { AdminOpsOverview } from '@family/shared';
import { useAuth } from '@/components/auth-provider';
import { Card } from '@/components/ui';
import { apiClient, formatApiError } from '@/lib/api-client';

function StatusBadge({ ok }: { ok: boolean }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${ok ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}
    >
      {ok ? 'OK' : 'FAIL'}
    </span>
  );
}

export function AdminOpsPage() {
  const { session } = useAuth();
  const [data, setData] = useState<AdminOpsOverview | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session?.accessToken) return;
    void apiClient.admin
      .ops(session.accessToken)
      .then(setData)
      .catch((err) => setError(formatApiError(err)));
  }, [session?.accessToken]);

  if (!session) return <p className="text-sm">Требуется вход администратора.</p>;
  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!data) return <p className="text-sm">Загрузка ops dashboard...</p>;

  return (
    <div className="space-y-6">
      <Card>
        <h1 className="text-2xl font-semibold">Admin Ops</h1>
        <p className="mt-1 text-sm text-stone-500">PostgreSQL / Redis / MinIO / Meili + очереди + ошибки с requestId</p>
        <p className="mt-2 text-xs text-stone-400">Обновлено: {new Date(data.timestamp).toLocaleString('ru-RU')}</p>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {Object.entries(data.health).map(([name, check]) => (
          <Card key={name}>
            <div className="flex items-center justify-between">
              <h2 className="font-semibold uppercase">{name}</h2>
              <StatusBadge ok={check.ok} />
            </div>
            {'latencyMs' in check && check.latencyMs != null ? (
              <p className="mt-2 text-sm text-stone-500">{check.latencyMs} ms</p>
            ) : null}
            {check.error ? <p className="mt-2 text-sm text-red-600">{check.error}</p> : null}
          </Card>
        ))}
      </div>

      <Card>
        <h2 className="font-semibold">Очереди BullMQ</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b text-xs uppercase text-stone-500">
                <th className="py-2">Queue</th>
                <th>Waiting</th>
                <th>Active</th>
                <th>Completed</th>
                <th>Failed</th>
                <th>Delayed</th>
              </tr>
            </thead>
            <tbody>
              {data.queues.map((q) => (
                <tr key={q.name} className="border-b border-stone-100">
                  <td className="py-2 font-mono text-xs">{q.name}</td>
                  <td>{q.waiting}</td>
                  <td>{q.active}</td>
                  <td>{q.completed}</td>
                  <td>{q.failed}</td>
                  <td>{q.delayed}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <h2 className="font-semibold">Последние ошибки (requestId)</h2>
        <ul className="mt-4 space-y-3">
          {data.recentErrors.length === 0 ? (
            <li className="text-sm text-stone-500">Нет записей</li>
          ) : (
            data.recentErrors.map((err) => (
              <li key={err.id} className="rounded-lg border p-3 text-sm">
                <p className="font-mono text-xs text-stone-500">
                  {err.requestId ?? '—'} · {err.statusCode} · {err.method} {err.path}
                </p>
                <p className="mt-1">{err.message}</p>
                <p className="mt-1 text-xs text-stone-400">{new Date(err.createdAt).toLocaleString('ru-RU')}</p>
              </li>
            ))
          )}
        </ul>
      </Card>
    </div>
  );
}
