'use client';

import type { AccessLogEntry } from '@family/shared';
import { Card } from '@/components/ui';

export function AccessLogViewer({ logs }: { logs: AccessLogEntry[] }) {
  return (
    <Card>
      <h3 className="text-lg font-semibold">Журнал доступа</h3>
      <p className="mt-1 text-sm text-stone-600">
        Просмотры публичных ссылок, экспорты и AI-операции (без сырого контента).
      </p>
      <ul className="mt-4 max-h-80 space-y-2 overflow-y-auto text-sm">
        {logs.length === 0 ? (
          <li className="text-stone-500">Записей пока нет.</li>
        ) : (
          logs.map((log) => (
            <li key={log.id} className="rounded border border-stone-200 p-2 dark:border-slate-700">
              <div className="font-medium">
                {log.action} — {log.resourceType}
                {log.resourceId ? ` / ${log.resourceId}` : ''}
              </div>
              <div className="text-xs text-stone-500">
                {new Date(log.createdAt).toLocaleString()}
                {log.ipHash ? ` · ip hash: ${log.ipHash.slice(0, 12)}…` : ''}
              </div>
            </li>
          ))
        )}
      </ul>
    </Card>
  );
}
