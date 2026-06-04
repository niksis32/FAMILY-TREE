'use client';

import { useAuth } from '@/components/auth-provider';
import { Button, Card, FormField, Input, PageHeader, Select } from '@/components/ui';
import { ApiError, apiClient, formatApiError } from '@/lib/api-client';
import type { StoryDraftDto, StoryTypeId } from '@family/shared';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { StoryDraftEditor } from './story-draft-editor';
import { SourceReferencesPanel } from './source-references-panel';
import { AIUncertaintyWarnings } from './ai-uncertainty-warnings';

const typeOptions: Array<{ id: '' | StoryTypeId; label: string }> = [
  { id: '', label: 'Все типы' },
  { id: 'person', label: 'Биография' },
  { id: 'family', label: 'Ветка' },
  { id: 'migration', label: 'Миграция' },
  { id: 'document_summary', label: 'Документ summary' },
  { id: 'timeline_narrative', label: 'Timeline narrative' },
  { id: 'era_context', label: 'Контекст эпохи' },
];

export function StoryDraftsPage() {
  const { session, logout } = useAuth();
  const token = session?.accessToken;

  const [items, setItems] = useState<StoryDraftDto[]>([]);
  const [selected, setSelected] = useState<StoryDraftDto | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [q, setQ] = useState('');
  const [type, setType] = useState<'' | StoryTypeId>('');

  const grouped = useMemo(() => {
    const groups = new Map<string, StoryDraftDto[]>();
    for (const d of items) {
      const key = d.storyType;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(d);
    }
    return Array.from(groups.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [items]);

  const load = useCallback(async () => {
    if (!token) return;
    setBusy(true);
    setError(null);
    try {
      const list = await apiClient.storytelling.draftsList({ type: type || undefined, q }, token);
      setItems(list);
      if (list.length && !selected) setSelected(list[0]);
    } catch (e) {
      setError(formatApiError(e));
      if (e instanceof ApiError && e.status === 401) logout();
    } finally {
      setBusy(false);
    }
  }, [token, type, q, selected, logout]);

  useEffect(() => {
    void load();
  }, [load]);

  const remove = async (id: string) => {
    if (!token) return;
    setBusy(true);
    try {
      await apiClient.storytelling.deleteDraft(id, token);
      const next = items.filter((x) => x.id !== id);
      setItems(next);
      setSelected((cur) => (cur?.id === id ? next[0] ?? null : cur));
    } catch (e) {
      setError(formatApiError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Story drafts"
        description="Черновики AI Storytelling (PROMPT 11): поиск, группировка по типу, удаление и ручная правка."
        action={
          <Button type="button" variant="secondary" disabled={!token || busy} onClick={() => void load()}>
            {busy ? 'Обновляем…' : 'Обновить'}
          </Button>
        }
      />

      <Card>
        <div className="grid gap-4 md:grid-cols-3">
          <FormField label="Поиск">
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="текст/заголовок" />
          </FormField>
          <FormField label="Тип">
            <Select value={type} onChange={(e) => setType(e.target.value as any)}>
              {typeOptions.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </Select>
          </FormField>
          <div className="flex items-end">
            <Button type="button" variant="primary" disabled={!token || busy} onClick={() => void load()}>
              Применить
            </Button>
          </div>
        </div>

        {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
      </Card>

      <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,0.42fr)_minmax(0,0.58fr)]">
        <Card>
          <h2 className="text-lg font-semibold">Список черновиков</h2>
          <p className="mt-2 text-xs text-stone-500 dark:text-slate-400">
            Показаны последние 200. Группировка по storyType.
          </p>

          <div className="mt-5 space-y-5">
            {grouped.length === 0 ? (
              <p className="text-sm text-stone-600 dark:text-slate-300">Черновиков пока нет.</p>
            ) : (
              grouped.map(([groupKey, drafts]) => (
                <div key={groupKey}>
                  <p className="text-xs font-semibold uppercase tracking-wider text-stone-400">{groupKey}</p>
                  <ul className="mt-2 space-y-2">
                    {drafts.slice(0, 50).map((d) => (
                      <li key={d.id} className="rounded-2xl border p-3 dark:border-slate-800">
                        <button
                          type="button"
                          className="w-full text-left"
                          onClick={() => setSelected(d)}
                          disabled={busy}
                        >
                          <p className="text-sm font-semibold">{d.title ?? d.id}</p>
                          <p className="mt-1 text-xs text-stone-500 dark:text-slate-400">
                            {d.mode} · {new Date(d.updatedAt).toLocaleString()}
                          </p>
                        </button>
                        <div className="mt-3 flex justify-end">
                          <Button type="button" variant="ghost" disabled={busy} onClick={() => void remove(d.id)}>
                            Удалить
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ))
            )}
          </div>
        </Card>

        <div className="space-y-6">
          {selected ? (
            <>
              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={!token || busy}
                  onClick={async () => {
                    if (!token || !selected) return;
                    setBusy(true);
                    setError(null);
                    try {
                      const updated = await apiClient.storytelling.factCheckDraft(selected.id, token);
                      setSelected(updated);
                      setItems((cur) => cur.map((x) => (x.id === updated.id ? updated : x)));
                    } catch (e) {
                      setError(formatApiError(e));
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  {busy ? 'Проверяем…' : 'Проверить факты'}
                </Button>
              </div>
              <AIUncertaintyWarnings draft={selected} />
              <StoryDraftEditor
                draft={selected}
                disabled={!token || busy}
                onSave={async (patch) => {
                  if (!token) return;
                  const updated = await apiClient.storytelling.updateDraft(selected.id, patch, token);
                  const next =
                    typeof patch.narrative === 'string'
                      ? await apiClient.storytelling.factCheckDraft(updated.id, token)
                      : updated;
                  setSelected(next);
                  setItems((cur) => cur.map((x) => (x.id === next.id ? next : x)));
                }}
              />
              <SourceReferencesPanel draft={selected} />
            </>
          ) : (
            <Card>
              <p className="text-sm text-stone-600 dark:text-slate-300">Выберите черновик слева.</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

