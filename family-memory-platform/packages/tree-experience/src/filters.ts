import type { TreeViewDataQuery } from '@family/shared';

export function buildViewDataQueryString(query: TreeViewDataQuery): string {
  const params: string[] = [];
  const add = (key: string, value: string) => params.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
  if (query.scope) add('scope', query.scope);
  if (query.depth != null) add('depth', String(query.depth));
  if (query.generationMin != null) add('generationMin', String(query.generationMin));
  if (query.generationMax != null) add('generationMax', String(query.generationMax));
  if (query.lineage) add('lineage', query.lineage);
  if (query.yearFrom != null) add('yearFrom', String(query.yearFrom));
  if (query.yearTo != null) add('yearTo', String(query.yearTo));
  if (query.country?.trim()) add('country', query.country.trim());
  if (query.surname?.trim()) add('surname', query.surname.trim());
  return params.length > 0 ? `?${params.join('&')}` : '';
}
