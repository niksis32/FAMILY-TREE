'use client';

import { useTranslations } from 'next-intl';
import type { TreeLineageFilter, TreeScopeMode, TreeViewDataQuery } from '@family/shared';
import { FormField, Select } from '@/components/ui';

export function TreeExperienceFilters({
  filters,
  onChange,
  surnames,
}: {
  filters: TreeViewDataQuery;
  onChange: (next: TreeViewDataQuery) => void;
  surnames: string[];
}) {
  const t = useTranslations('treeExperience');

  const patch = (partial: Partial<TreeViewDataQuery>) => onChange({ ...filters, ...partial });

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <FormField label={t('filters.scope')}>
        <Select
          value={filters.scope ?? 'full'}
          onChange={(e) => patch({ scope: e.target.value as TreeScopeMode })}
        >
          <option value="ancestors">{t('filters.scopeAncestors')}</option>
          <option value="descendants">{t('filters.scopeDescendants')}</option>
          <option value="full">{t('filters.scopeFull')}</option>
        </Select>
      </FormField>

      <FormField label={t('filters.lineage')}>
        <Select
          value={filters.lineage ?? 'both'}
          onChange={(e) => patch({ lineage: e.target.value as TreeLineageFilter })}
        >
          <option value="both">{t('filters.lineageBoth')}</option>
          <option value="paternal">{t('filters.lineagePaternal')}</option>
          <option value="maternal">{t('filters.lineageMaternal')}</option>
        </Select>
      </FormField>

      <FormField label={t('filters.surname')}>
        <Select value={filters.surname ?? ''} onChange={(e) => patch({ surname: e.target.value || undefined })}>
          <option value="">{t('filters.allSurnames')}</option>
          {surnames.map((surname) => (
            <option key={surname} value={surname}>
              {surname}
            </option>
          ))}
        </Select>
      </FormField>

      <FormField label={t('filters.country')}>
        <input
          type="text"
          className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
          placeholder={t('filters.countryPh')}
          value={filters.country ?? ''}
          onChange={(e) => patch({ country: e.target.value || undefined })}
        />
      </FormField>

      <FormField label={t('filters.generationMin')}>
        <input
          type="number"
          className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
          value={filters.generationMin ?? ''}
          onChange={(e) => patch({ generationMin: e.target.value ? Number(e.target.value) : undefined })}
        />
      </FormField>

      <FormField label={t('filters.generationMax')}>
        <input
          type="number"
          className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
          value={filters.generationMax ?? ''}
          onChange={(e) => patch({ generationMax: e.target.value ? Number(e.target.value) : undefined })}
        />
      </FormField>

      <FormField label={t('filters.yearFrom')}>
        <input
          type="number"
          className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
          value={filters.yearFrom ?? ''}
          onChange={(e) => patch({ yearFrom: e.target.value ? Number(e.target.value) : undefined })}
        />
      </FormField>

      <FormField label={t('filters.yearTo')}>
        <input
          type="number"
          className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
          value={filters.yearTo ?? ''}
          onChange={(e) => patch({ yearTo: e.target.value ? Number(e.target.value) : undefined })}
        />
      </FormField>
    </div>
  );
}
