'use client';

import { Link } from '@/i18n/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/components/auth-provider';
import { TreeCanvas } from '@/components/tree-canvas';
import { Badge, Button, Card, FormField, Select } from '@/components/ui';
import { PersonSearchCombobox } from '@/components/person-search-combobox';
import { ShareModal } from '@/features/privacy/share-modal';
import { useWorkspaceId } from '@/features/collaboration/use-workspace-id';
import { apiClient, formatApiError, type FamilyRecord, type TreeGraphResponse, type TreePersonNode, type TreeViewMode } from '@/lib/api-client';
import { formatPersonLabel } from '@/lib/person-display';
import type { PersonSummary } from '@family/shared';

const emptyGraph: TreeGraphResponse = {
  rootPersonId: '',
  mode: 'full',
  nodes: [],
  edges: [],
};

function personSurname(person: Pick<PersonSummary, 'familyName'>) {
  return person.familyName?.trim() || '';
}

export function TreeExplorer() {
  const { session } = useAuth();
  const workspaceId = useWorkspaceId();
  const t = useTranslations('treeWorkspace');
  const tCommon = useTranslations('common');
  const [persons, setPersons] = useState<PersonSummary[]>([]);
  const [families, setFamilies] = useState<FamilyRecord[]>([]);
  const [selectedSurname, setSelectedSurname] = useState('');
  const [rootPersonId, setRootPersonId] = useState('');
  const [mode, setMode] = useState<TreeViewMode>('descendants');
  const [graph, setGraph] = useState<TreeGraphResponse>(emptyGraph);
  const [selectedPerson, setSelectedPerson] = useState<TreePersonNode | null>(null);
  const [status, setStatus] = useState('');
  const [shareOpen, setShareOpen] = useState(false);

  const modes = useMemo(
    () =>
      [
        { value: 'ancestors' as const, label: t('modeAncestors') },
        { value: 'descendants' as const, label: t('modeDescendants') },
        { value: 'full' as const, label: t('modeFull') },
      ],
    [t],
  );

  const surnames = useMemo(() => {
    const unique = new Set<string>();
    for (const person of persons) {
      const surname = personSurname(person);
      if (surname) unique.add(surname);
    }
    return [...unique].sort((a, b) => a.localeCompare(b, 'ru'));
  }, [persons]);

  const personsBySurname = useMemo(() => {
    if (!selectedSurname) return persons;
    return persons.filter((person) => personSurname(person) === selectedSurname);
  }, [persons, selectedSurname]);

  useEffect(() => {
    async function loadPersons() {
      try {
        const [list, familyList] = await Promise.all([
          apiClient.persons.list(session?.accessToken),
          apiClient.families.list(session?.accessToken),
        ]);
        setPersons(list);
        setFamilies(familyList);
      } catch (error) {
        setStatus(formatApiError(error));
      }
    }
    void loadPersons();
  }, [session?.accessToken]);

  useEffect(() => {
    if (personsBySurname.length === 0) {
      setRootPersonId('');
      return;
    }
    if (!rootPersonId || !personsBySurname.some((person) => person.id === rootPersonId)) {
      setRootPersonId(personsBySurname[0].id);
    }
  }, [personsBySurname, rootPersonId]);

  useEffect(() => {
    let cancelled = false;

    async function loadGraph() {
      if (!rootPersonId.trim()) {
        setGraph({ ...emptyGraph, mode });
        setSelectedPerson(null);
        setStatus('');
        return;
      }
      setStatus(t('buildingTree'));

      try {
        const nextGraph = await apiClient.tree.graph(rootPersonId.trim(), mode, session?.accessToken);
        if (cancelled) return;
        setGraph(nextGraph);
        const rootNode =
          nextGraph.nodes.find((node) => node.id === nextGraph.rootPersonId) ?? nextGraph.nodes[0] ?? null;
        setSelectedPerson((current) => current ?? rootNode);
        setStatus(t('treeStats', { nodes: nextGraph.nodes.length, edges: nextGraph.edges.length }));
      } catch (error) {
        if (cancelled) return;
        setGraph({ ...emptyGraph, mode });
        setSelectedPerson(null);
        setStatus(formatApiError(error));
      }
    }

    void loadGraph();

    return () => {
      cancelled = true;
    };
  }, [mode, rootPersonId, session?.accessToken, t]);

  const rootNode = useMemo(
    () => graph.nodes.find((node) => node.id === graph.rootPersonId) ?? null,
    [graph],
  );

  const rootGeneration = rootNode?.generation ?? 0;

  const treeScopeMembers = useMemo(() => {
    const sorted = [...graph.nodes].sort((a, b) => a.generation - b.generation || a.label.localeCompare(b.label, 'ru'));
    if (mode === 'ancestors') {
      return sorted.filter((node) => node.generation <= rootGeneration);
    }
    if (mode === 'descendants') {
      return sorted.filter((node) => node.generation >= rootGeneration);
    }
    return sorted;
  }, [graph.nodes, mode, rootGeneration]);

  const statusLine = status || t('pickSurnameAndRoot');

  const shareFamilyId = useMemo(() => {
    if (!rootPersonId) return null;
    for (const family of families) {
      if (family.members?.some((m) => m.person.id === rootPersonId)) {
        return family.id;
      }
    }
    return null;
  }, [families, rootPersonId]);

  const shareFamilyName = families.find((f) => f.id === shareFamilyId)?.name;

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
      <div className="space-y-4">
        <Card className="p-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <FormField label={t('surname')}>
              <Select
                value={selectedSurname}
                onChange={(event) => {
                  setSelectedSurname(event.target.value);
                  setSelectedPerson(null);
                }}
              >
                <option value="">{t('allSurnames')}</option>
                {surnames.map((surname) => (
                  <option key={surname} value={surname}>
                    {surname}
                  </option>
                ))}
              </Select>
            </FormField>

            <FormField label={t('rootPerson')}>
              <PersonSearchCombobox
                persons={personsBySurname}
                value={rootPersonId}
                onChange={(personId) => {
                  setRootPersonId(personId);
                  setSelectedPerson(null);
                }}
                disabled={personsBySurname.length === 0}
                placeholder={tCommon('notSelected')}
              />
            </FormField>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {modes.map((item) => (
              <Button
                key={item.value}
                type="button"
                variant={mode === item.value ? 'primary' : 'secondary'}
                onClick={() => setMode(item.value)}
              >
                {item.label}
              </Button>
            ))}
            {session?.accessToken && shareFamilyId ? (
              <Button type="button" variant="secondary" onClick={() => setShareOpen(true)}>
                Поделиться деревом
              </Button>
            ) : null}
          </div>

          {rootNode ? (
            <p className="mt-3 text-sm font-medium text-family-primary dark:text-family-accent">
              {t('treeFounder', { name: rootNode.label })}
            </p>
          ) : null}
          <p className="mt-2 text-sm text-stone-500 dark:text-slate-400">{statusLine}</p>
        </Card>

        <TreeCanvas graph={graph} onPersonClick={setSelectedPerson} />
      </div>

      <PersonDetailsPanel
        selectedPerson={selectedPerson}
        mode={mode}
        surname={selectedSurname}
        familyLinePersons={personsBySurname}
        treeScopeMembers={treeScopeMembers}
        onSelectPerson={(node) => setSelectedPerson(node)}
        onSetRootPersonId={(personId) => {
          setRootPersonId(personId);
          setSelectedPerson(null);
        }}
      />

      {session?.accessToken && shareFamilyId ? (
        <ShareModal
          open={shareOpen}
          onClose={() => setShareOpen(false)}
          token={session.accessToken}
          resourceType="FAMILY_TREE"
          resourceId={shareFamilyId}
          workspaceId={workspaceId ?? undefined}
          label={shareFamilyName ?? 'Семейное древо'}
        />
      ) : null}
    </div>
  );
}

function PersonDetailsPanel({
  selectedPerson,
  mode,
  surname,
  familyLinePersons,
  treeScopeMembers,
  onSelectPerson,
  onSetRootPersonId,
}: {
  selectedPerson: TreePersonNode | null;
  mode: TreeViewMode;
  surname: string;
  familyLinePersons: PersonSummary[];
  treeScopeMembers: TreePersonNode[];
  onSelectPerson: (node: TreePersonNode) => void;
  onSetRootPersonId: (personId: string) => void;
}) {
  const t = useTranslations('treeWorkspace');
  const tCommon = useTranslations('common');

  const scopeTitle =
    mode === 'descendants'
      ? t('scopeDescendants')
      : mode === 'ancestors'
        ? t('scopeAncestors')
        : t('scopeOnTree');

  return (
    <Card className="sticky top-28 max-h-[calc(100vh-8rem)] overflow-y-auto">
      <h2 className="text-xl font-semibold">{t('participants')}</h2>

      {selectedPerson ? (
        <div className="mt-4 rounded-2xl border border-family-accent/40 bg-family-accent/5 p-4 dark:bg-slate-950">
          <p className="text-xs text-stone-500 dark:text-slate-400">{t('selectedOnTree')}</p>
          <p className="mt-1 text-lg font-semibold">{selectedPerson.label}</p>
          <p className="mt-1 text-sm text-stone-500 dark:text-slate-400">
            {[selectedPerson.birthDate?.slice(0, 4), selectedPerson.deathDate?.slice(0, 4)].filter(Boolean).join(' — ') ||
              tCommon('noDate')}
          </p>
          <Link
            href={`/persons/${selectedPerson.personId}`}
            className="mt-3 inline-block text-sm font-semibold text-family-primary underline dark:text-family-accent"
          >
            {t('openProfile')}
          </Link>
        </div>
      ) : (
        <p className="mt-3 text-sm text-stone-600 dark:text-slate-300">{t('clickCardHint')}</p>
      )}

      <div className="mt-6">
        <p className="text-sm font-semibold text-stone-700 dark:text-slate-200">
          {surname ? t('allWithSurname', { surname }) : t('allPersons')} ({familyLinePersons.length})
        </p>
        <MemberList
          emptyLabel={t('listEmpty')}
          items={familyLinePersons.map((person) => ({
            id: person.id,
            label: formatPersonLabel(person),
            sub: [person.birthDate?.slice(0, 4), person.deathDate?.slice(0, 4)].filter(Boolean).join(' — '),
          }))}
          onPick={(id) => onSetRootPersonId(id)}
        />
      </div>

      <div className="mt-6 border-t border-stone-200 pt-6 dark:border-slate-800">
        <p className="text-sm font-semibold text-stone-700 dark:text-slate-200">
          {scopeTitle} ({treeScopeMembers.length})
        </p>
        <MemberList
          emptyLabel={t('listEmpty')}
          items={treeScopeMembers.map((node) => ({
            id: node.personId,
            label: node.label,
            sub: t('generation', {
              gen: node.generation >= 0 ? `+${node.generation}` : String(node.generation),
            }),
            badge: node.id === selectedPerson?.id ? t('onTreeBadge') : undefined,
          }))}
          onPick={(id) => {
            const node = treeScopeMembers.find((n) => n.personId === id);
            if (node) onSelectPerson(node);
          }}
        />
      </div>
    </Card>
  );
}

function MemberList({
  items,
  onPick,
  emptyLabel,
}: {
  items: Array<{ id: string; label: string; sub?: string; badge?: string }>;
  onPick: (id: string) => void;
  emptyLabel: string;
}) {
  if (items.length === 0) {
    return <p className="mt-2 text-sm text-stone-500 dark:text-slate-400">{emptyLabel}</p>;
  }

  return (
    <ul className="mt-2 space-y-2">
      {items.map((item) => (
        <li key={item.id}>
          <button
            type="button"
            onClick={() => onPick(item.id)}
            className="w-full rounded-xl border bg-stone-50 px-3 py-2 text-left text-sm transition hover:border-family-accent dark:bg-slate-950"
          >
            <span className="font-medium">{item.label}</span>
            {item.sub ? <span className="mt-0.5 block text-xs text-stone-500 dark:text-slate-400">{item.sub}</span> : null}
            {item.badge ? (
              <span className="mt-1 inline-block">
                <Badge tone="gold">{item.badge}</Badge>
              </span>
            ) : null}
          </button>
        </li>
      ))}
    </ul>
  );
}
