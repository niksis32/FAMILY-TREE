'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { PersonSummary, StoryDraftDto, StoryModeId } from '@family/shared';
import { Button, Card, FormField, Input, Select } from '@/components/ui';
import { apiClient, formatApiError } from '@/lib/api-client';
import { StoryDraftEditor } from './story-draft-editor';
import { SourceReferencesPanel } from './source-references-panel';
import { AIUncertaintyWarnings } from './ai-uncertainty-warnings';

const modes: Array<{ id: StoryModeId; label: string }> = [
  { id: 'dry_biography', label: 'Сухая биография' },
  { id: 'artistic', label: 'Художественный рассказ' },
  { id: 'archive', label: 'Архивный стиль' },
  { id: 'family_book', label: 'Семейная книга' },
];

export function GenerateStoryPanel({
  personId,
  familyOptions,
  token,
}: {
  personId: string;
  familyOptions?: Array<{ id: string; name?: string | null }> | null;
  token: string | null | undefined;
}) {
  const [mode, setMode] = useState<StoryModeId>('dry_biography');
  const [familyId, setFamilyId] = useState('');
  const [yearFrom, setYearFrom] = useState('');
  const [yearTo, setYearTo] = useState('');
  const [familyQuery, setFamilyQuery] = useState('');
  const [allFamilies, setAllFamilies] = useState<Array<{ id: string; name?: string | null }>>([]);
  const [allPersons, setAllPersons] = useState<PersonSummary[]>([]);
  const [personQuery, setPersonQuery] = useState('');
  const [migrationScope, setMigrationScope] = useState<'person' | 'family' | 'multi'>('person');
  const [selectedPersonIds, setSelectedPersonIds] = useState<string[]>([]);
  const [draft, setDraft] = useState<StoryDraftDto | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const canRun = Boolean(token && personId);

  useEffect(() => {
    if (!token) return;
    void (async () => {
      try {
        const [families, persons] = await Promise.all([apiClient.families.list(token), apiClient.persons.list(token)]);
        setAllFamilies(families.map((f) => ({ id: f.id, name: f.name ?? null })));
        setAllPersons(persons);
      } catch {
        // Optional: keep UI working without global lists
      }
    })();
  }, [token]);

  const run = useCallback(
    async (kind: 'person' | 'timeline' | 'family' | 'migration' | 'era') => {
      if (!token) return;
      setBusy(true);
      setStatus(null);
      try {
        const body = { mode, language: 'ru' as const };
        const data = await (async () => {
          if (kind === 'person') return apiClient.storytelling.generatePerson(personId, body, token);
          if (kind === 'timeline') return apiClient.storytelling.generateTimelineNarrative(personId, body, token);
          if (kind === 'family') {
            if (!familyId.trim()) throw new Error('Укажите familyId');
            return apiClient.storytelling.generateFamily(familyId.trim(), body, token);
          }
          if (kind === 'migration') {
            if (migrationScope === 'family') {
              const fid = familyId.trim() || undefined;
              if (!fid) throw new Error('Укажите familyId для migration');
              return apiClient.storytelling.generateMigration({ ...body, familyId: fid }, token);
            }
            if (migrationScope === 'multi') {
              const ids = selectedPersonIds.filter(Boolean);
              if (ids.length === 0) throw new Error('Выберите персон для migration');
              return apiClient.storytelling.generateMigration({ ...body, personIds: ids }, token);
            }
            return apiClient.storytelling.generateMigration({ ...body, personId }, token);
          }
          const yf = yearFrom.trim() ? Number(yearFrom.trim()) : undefined;
          const yt = yearTo.trim() ? Number(yearTo.trim()) : undefined;
          return apiClient.storytelling.generateEraContext(
            { ...body, personId, familyId: familyId.trim() || undefined, yearFrom: yf, yearTo: yt },
            token,
          );
        })();
        setDraft(data);
      } catch (e) {
        setStatus(formatApiError(e));
      } finally {
        setBusy(false);
      }
    },
    [token, personId, mode, familyId, yearFrom, yearTo, migrationScope, selectedPersonIds],
  );

  const headline = useMemo(() => {
    if (!draft) return 'AI Storytelling (PROMPT 11)';
    const kind =
      draft.storyType === 'timeline_narrative'
        ? 'Timeline narrative'
        : draft.storyType === 'family'
          ? 'Family story'
          : draft.storyType === 'migration'
            ? 'Migration story'
            : draft.storyType === 'era_context'
              ? 'Era context'
              : 'Биография';
    return `${kind} — ${modes.find((m) => m.id === draft.mode)?.label ?? draft.mode}`;
  }, [draft]);

  const familiesFromPerson = familyOptions ?? [];
  const families = allFamilies.length > 0 ? allFamilies : familiesFromPerson;
  const familyFiltered = familyQuery.trim()
    ? families.filter((f) => {
        const hay = `${f.name ?? ''} ${f.id}`.toLowerCase();
        return hay.includes(familyQuery.trim().toLowerCase());
      })
    : families;

  const personsFiltered = personQuery.trim()
    ? allPersons.filter((p) => {
        const hay = `${p.givenName ?? ''} ${p.familyName ?? ''} ${p.id}`.toLowerCase();
        return hay.includes(personQuery.trim().toLowerCase());
      })
    : allPersons;

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">{headline}</h2>
          <p className="mt-2 text-sm text-stone-600 dark:text-slate-300">
            Каждый факт должен быть из данных платформы/документа или помечен как предположение. Сейчас включён stub-режим
            (без LLM), но контракт уже citation-aware.
          </p>
        </div>
        <div className="min-w-[260px]">
          <FormField label="Режим рассказа">
            <Select value={mode} onChange={(e) => setMode(e.target.value as StoryModeId)} disabled={!canRun || busy}>
              {modes.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </Select>
          </FormField>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <Button type="button" disabled={!canRun || busy} onClick={() => run('person')}>
          {busy ? 'Генерируем…' : 'Сгенерировать биографию'}
        </Button>
        <Button type="button" variant="secondary" disabled={!canRun || busy} onClick={() => run('timeline')}>
          {busy ? 'Генерируем…' : 'Сгенерировать narrative timeline'}
        </Button>
        <Button type="button" variant="secondary" disabled={!canRun || busy} onClick={() => run('migration')}>
          {busy ? 'Генерируем…' : 'Сгенерировать рассказ о миграции'}
        </Button>
        <Button type="button" variant="secondary" disabled={!canRun || busy} onClick={() => run('era')}>
          {busy ? 'Генерируем…' : 'Сгенерировать исторический контекст эпохи'}
        </Button>
        <Button type="button" variant="secondary" disabled={!canRun || busy || !familyId.trim()} onClick={() => run('family')}>
          {busy ? 'Генерируем…' : 'Сгенерировать историю ветки (family)'}
        </Button>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-3">
        <FormField label="Family (опционально)">
          <div className="grid gap-2">
            <Input
              placeholder="поиск семьи по названию/id"
              value={familyQuery}
              onChange={(e) => setFamilyQuery(e.target.value)}
              disabled={!canRun || busy}
            />
            <Select value={familyId} onChange={(e) => setFamilyId(e.target.value)} disabled={!canRun || busy}>
              <option value="">—</option>
              {familyFiltered.slice(0, 80).map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name?.trim() ? `${f.name} (${f.id})` : f.id}
                </option>
              ))}
            </Select>
          </div>
        </FormField>
        <FormField label="Era context: yearFrom (опц.)">
          <Input placeholder="например 1914" value={yearFrom} onChange={(e) => setYearFrom(e.target.value)} disabled={!canRun || busy} />
        </FormField>
        <FormField label="Era context: yearTo (опц.)">
          <Input placeholder="например 1945" value={yearTo} onChange={(e) => setYearTo(e.target.value)} disabled={!canRun || busy} />
        </FormField>
      </div>

      <div className="mt-5 rounded-3xl border p-5 dark:border-slate-800">
        <p className="text-sm font-semibold">Migration scope</p>
        <div className="mt-3 grid gap-4 md:grid-cols-3">
          <FormField label="Источник миграции">
            <Select
              value={migrationScope}
              onChange={(e) => setMigrationScope(e.target.value as 'person' | 'family' | 'multi')}
              disabled={!canRun || busy}
            >
              <option value="person">Текущая персона</option>
              <option value="family">Семья (familyId)</option>
              <option value="multi">Несколько персон</option>
            </Select>
          </FormField>

          {migrationScope === 'multi' ? (
            <>
              <FormField label="Поиск персоны">
                <Input
                  placeholder="поиск по имени/id"
                  value={personQuery}
                  onChange={(e) => setPersonQuery(e.target.value)}
                  disabled={!canRun || busy}
                />
              </FormField>
              <FormField label="Персоны (multi-select)">
                <Select
                  multiple
                  value={selectedPersonIds}
                  onChange={(e) => {
                    const next = Array.from(e.target.selectedOptions).map((o) => o.value);
                    setSelectedPersonIds(next);
                  }}
                  disabled={!canRun || busy}
                  className="min-h-28"
                >
                  {personsFiltered.slice(0, 200).map((p) => (
                    <option key={p.id} value={p.id}>
                      {`${p.givenName}${p.familyName ? ` ${p.familyName}` : ''}`} ({p.id})
                    </option>
                  ))}
                </Select>
              </FormField>
            </>
          ) : null}
        </div>
        <p className="mt-3 text-xs text-stone-500 dark:text-slate-400">
          Для multi-person миграции используется `personIds[]` (без `familyId`).
        </p>
      </div>

      {status ? <p className="mt-4 text-sm text-red-600">{status}</p> : null}

      {draft ? (
        <div className="mt-6 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-4">
            <AIUncertaintyWarnings draft={draft} />
            <StoryDraftEditor
              draft={draft}
              disabled={!canRun || busy}
              onSave={async (patch) => {
                if (!token) return;
                const updated = await apiClient.storytelling.updateDraft(draft.id, patch, token);
                setDraft(updated);
              }}
            />
          </div>
          <SourceReferencesPanel draft={draft} />
        </div>
      ) : null}
    </Card>
  );
}

