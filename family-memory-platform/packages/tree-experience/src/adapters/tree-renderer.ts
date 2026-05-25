import type { TreeExperienceRenderMode, TreeViewDataResponse, TreeViewNode } from '@family/shared';

export interface TreeRendererContext {
  data: TreeViewDataResponse;
  selectedPersonId?: string | null;
  onPersonClick?: (node: TreeViewNode) => void;
}

export interface TreeExperienceRenderer {
  mode: TreeExperienceRenderMode;
  render: (context: TreeRendererContext) => unknown;
}

export type FutureImmersiveMode = 'vr' | 'ar';
