'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { TreeViewDataQuery } from '@family/shared';
import { useAuth } from '@/components/auth-provider';
import { Badge, Card, FormField, Select } from '@/components/ui';
import { apiClient, formatApiError } from '@/lib/api-client';
import { formatPersonLabel } from '@/lib/person-display';
import type { PersonSummary } from '@family/shared';
import { TreeViewDataProvider } from './tree-view-data-context';
import type { TreeDisplayMode } from './tree-view-data-context';
import { TreeViewSwitcher } from './tree-view-switcher';
import { TreeExperienceFilters } from './tree-experience-filters';
import { PersonInsightPanel } from './person-insight-panel';
import { TreeExperienceActiveView } from './tree-experience-active-view';
import type { TreeViewDataResponse, TreeViewNode } from '@family/shared';

function personSurname(person: Pick<PersonSummary, 'familyName'>) {
  return person.familyName?.trim() || '';
}

export function TreeExperienceShell() {
  const { session } = useAuth();
  const t = useTranslations('treeExperience');
  const [persons, setPersons] = useState<PersonSummary[]>([]);
  const [rootPersonId, setRootPersonId] = useState('');
  const [filters, setFilters] = useState<TreeViewDataQuery>({ scope: 'full', depth: 10 });
  const [displayMode, setDisplayMode] = useState<TreeDisplayMode>('classic');
  const [data, setData] = useState<TreeViewDataResponse | null>(null);
  const [selectedNode, setSelectedNode] = useState<TreeViewNode | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const surnames = useMemo(() => {
    const unique = new Set<string>();
    for (const person of persons) {
      const surname = personSurname(person);
      if (surname) unique.add(surname);
    }
    return [...unique].sort((a, b) => a.localeCompare(b, 'ru'));
  }, [persons]);

  const personsBySurname = useMemo(() => {
    if (!filters.surname) return persons;
    return persons.filter((p) => personSurname(p) === filters.surname);
  }, [persons, filters.surname]);

  useEffect(() => {
    void apiClient.persons
      .list(session?.accessToken)
      .then(setPersons)
      .catch((err) => setError(formatApiError(err)));
  }, [session?.accessToken]);

  useEffect(() => {
    if (personsBySurname.length === 0) {
      setRootPersonId('');
      return;
    }
    if (!rootPersonId || !personsBySurname.some((p) => p.id === rootPersonId)) {
      setRootPersonId(personsBySurname[0].id);
    }
  }, [personsBySurname, rootPersonId]);

  const loadViewData = useCallback(async () => {
    if (!rootPersonId.trim()) {
      setData(null);
      setSelectedNode(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.tree.viewData(rootPersonId.trim(), filters, session?.accessToken);
      setData(response);
      const root =
        response.nodes.find((n) => n.personId === response.meta.rootPersonId) ?? response.nodes[0] ?? null;
      setSelectedNode((current) => current ?? root);
    } catch (err) {
      setData(null);
      setError(formatApiError(err));
    } finally {
      setLoading(false);
    }
  }, [filters, rootPersonId, session?.accessToken]);

  useEffect(() => {
    void loadViewData();
  }, [loadViewData]);

  const contextValue = useMemo(
    () => ({
      data,
      loading,
      error,
      displayMode,
      setDisplayMode,
      selectedNode,
      setSelectedNode,
      filters,
      setFilters,
      refetch: loadViewData,
    }),
    [data, loading, error, displayMode, selectedNode, filters, loadViewData],
  );

  return (
    <TreeViewDataProvider value={contextValue}>
      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          <Card className="space-y-4 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <TreeViewSwitcher mode={displayMode} onChange={setDisplayMode} />
              {data ? (
                <Badge tone="neutral">
                  {t('stats', { nodes: data.meta.nodeCount, edges: data.meta.edgeCount })}
                </Badge>
              ) : null}
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <FormField label={t('rootPerson')}>
                <Select
                  value={rootPersonId}
                  onChange={(e) => {
                    setRootPersonId(e.target.value);
                    setSelectedNode(null);
                  }}
                  disabled={personsBySurname.length === 0}
                >
                  <option value="">{t('pickRoot')}</option>
                  {personsBySurname.map((person) => (
                    <option key={person.id} value={person.id}>
                      {formatPersonLabel(person)}
                    </option>
                  ))}
                </Select>
              </FormField>
            </div>

            <TreeExperienceFilters filters={filters} onChange={setFilters} surnames={surnames} />
            {loading ? <p className="text-sm text-stone-500">{t('loading')}</p> : null}
            {error ? <p className="text-sm text-rose-600">{error}</p> : null}
          </Card>

          <TreeExperienceActiveView />
        </div>

        <PersonInsightPanel selectedNode={selectedNode} data={data} />
      </div>
    </TreeViewDataProvider>
  );
}
