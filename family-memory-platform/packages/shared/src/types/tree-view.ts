/** Tree Experience 2.0 — universal view payload for all render modes */

export type TreeScopeMode = 'ancestors' | 'descendants' | 'full';
export type TreeLineageFilter = 'both' | 'paternal' | 'maternal';
export type TreeLayoutRole = 'root' | 'ancestor' | 'descendant' | 'spouse' | 'sibling' | 'relative';
export type TreeExperienceRenderMode =
  | 'classic'
  | 'graph'
  | 'three-d'
  | 'timeline'
  | 'map'
  | 'vr'
  | 'ar';

export interface TreeViewDataQuery {
  scope?: TreeScopeMode;
  depth?: number;
  generationMin?: number;
  generationMax?: number;
  lineage?: TreeLineageFilter;
  yearFrom?: number;
  yearTo?: number;
  country?: string;
  surname?: string;
}

export interface TreeViewDataMeta {
  rootPersonId: string;
  scope: TreeScopeMode;
  depth: number;
  generatedAt: string;
  filtersApplied: TreeViewDataQuery;
  nodeCount: number;
  edgeCount: number;
}

export interface TreeViewNode {
  id: string;
  personId: string;
  label: string;
  givenName: string;
  familyName?: string | null;
  gender?: string | null;
  birthDate?: string | null;
  deathDate?: string | null;
  birthYear?: number | null;
  deathYear?: number | null;
  isLiving: boolean;
  generation: number;
  layoutRole: TreeLayoutRole;
  spouseGroupId?: string | null;
  familyIds: string[];
  avatarUrl?: string | null;
}

export interface TreeViewEdge {
  id: string;
  source: string;
  target: string;
  type: string;
  label: string;
}

export interface TreeGenerationBand {
  generation: number;
  label: string;
  personIds: string[];
}

export interface TreeViewFamily {
  id: string;
  name?: string | null;
  memberIds: string[];
  roles: Record<string, string>;
}

export interface TreeViewEvent {
  id: string;
  personId?: string | null;
  familyId?: string | null;
  type: string;
  title: string;
  date?: string | null;
  year?: number | null;
  placeId?: string | null;
  placeName?: string | null;
}

export interface TreeViewPlace {
  id: string;
  name: string;
  latitude?: number | null;
  longitude?: number | null;
  country?: string | null;
  region?: string | null;
  city?: string | null;
  personIds: string[];
  eventIds: string[];
}

export interface TreeViewMediaPreview {
  mediaId: string;
  personId?: string | null;
  title?: string | null;
  mimeType: string;
  previewUrl?: string | null;
}

export interface TreeViewDataResponse {
  meta: TreeViewDataMeta;
  nodes: TreeViewNode[];
  edges: TreeViewEdge[];
  generations: TreeGenerationBand[];
  families: TreeViewFamily[];
  events: TreeViewEvent[];
  places: TreeViewPlace[];
  mediaPreview: TreeViewMediaPreview[];
}

/** @deprecated Use TreeViewDataResponse — kept for MVP tree endpoints */
export interface TreeGraphResponse {
  rootPersonId: string;
  mode: TreeScopeMode;
  nodes: Array<{
    id: string;
    personId: string;
    label: string;
    givenName: string;
    familyName?: string | null;
    birthDate?: string | null;
    deathDate?: string | null;
    isLiving?: boolean;
    generation: number;
  }>;
  edges: TreeViewEdge[];
}
